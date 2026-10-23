// CMED maximum consumer prices from anvisa-feeds (`/cmed/dados/`, contract in its `schema.md`), read at
// build time. Same rules as the operator data: every source is required and validated, so a contract change
// upstream fails the build instead of publishing a wrong price. Prices are in centavos, per ICMS rate.
import { getJson, once, pool } from "./fetch";
import { slug } from "./slug";
import { bool, list, num, obj, str, strOrNull, type Obj } from "./validar";

/** ICMS rates in the CMED list, as the JSON keys spell them. */
export const ALIQUOTAS = ["0", "12", "17", "17.5", "18", "19", "19.5", "20", "20.5", "21", "22", "22.5", "23"] as const;
export type Aliquota = (typeof ALIQUOTAS)[number];

export interface ItemProduto {
  registro_produto: string;
  produto: string;
  laboratorio: string;
  substancia: string;
  tipo_produto: string | null;
  apresentacoes: number;
  comercializado: boolean;
}

export interface Apresentacao {
  ggrem: string;
  apresentacao: string;
  eans: string[];
  regime_preco: string;
  comercializado: boolean;
  icms_0: boolean;
  pmc: Partial<Record<Aliquota, number>>;
  pmc_alc: Partial<Record<Aliquota, number>>;
}

export interface Produto extends Omit<ItemProduto, "apresentacoes"> {
  cnpj: string;
  classe_terapeutica: string | null;
  tarja: string | null;
  stamp: string;
  publicado_em: string;
  apresentacoes: Apresentacao[];
}

export interface IndiceProdutos {
  stamp: string;
  publicado_em: string;
  produtos: ItemProduto[];
}

const REGISTRO = /^\d{9}$/;
const GGREM = /^\d{15}$/;
const STAMP = /^\d{8}$/;

function precos(raw: unknown, where: string): Partial<Record<Aliquota, number>> {
  const o = obj(raw, where);
  const out: Partial<Record<Aliquota, number>> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!(ALIQUOTAS as readonly string[]).includes(k)) throw new Error(`${where}: unknown rate ${k}`);
    if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) throw new Error(`${where}: bad price at ${k}`);
    out[k as Aliquota] = v;
  }
  return out;
}

function parseItem(o: Obj, where: string): Omit<ItemProduto, "apresentacoes"> {
  const registro = str(o, "registro_produto", where);
  if (!REGISTRO.test(registro)) throw new Error(`${where}: bad registro_produto ${registro}`);
  return {
    registro_produto: registro,
    produto: str(o, "produto", where),
    laboratorio: str(o, "laboratorio", where),
    substancia: str(o, "substancia", where),
    tipo_produto: strOrNull(o, "tipo_produto", where),
    comercializado: bool(o, "comercializado", where),
  };
}

export function parseIndiceProdutos(raw: unknown): IndiceProdutos {
  const o = obj(raw, "produtos.json");
  const stamp = str(o, "stamp", "produtos.json");
  if (!STAMP.test(stamp)) throw new Error(`produtos.json: bad stamp ${stamp}`);
  const produtos = list(o.produtos, "produtos.json produtos").map((x, i) => {
    const where = `produtos.json[${i}]`;
    const p = obj(x, where);
    return { ...parseItem(p, where), apresentacoes: num(p, "apresentacoes", where) };
  });
  if (produtos.length === 0) throw new Error("produtos.json: empty");
  return { stamp, publicado_em: str(o, "publicado_em", "produtos.json"), produtos };
}

export function parseProduto(raw: unknown): Produto {
  const o = obj(raw, "produto");
  const where = `produto ${String(o.registro_produto)}`;
  const apresentacoes = list(o.apresentacoes, `${where} apresentacoes`).map((x): Apresentacao => {
    const a = obj(x, `${where} apresentacoes`);
    const ggrem = str(a, "ggrem", where);
    if (!GGREM.test(ggrem)) throw new Error(`${where}: bad ggrem ${ggrem}`);
    const pmc = precos(a.pmc, `${where} ${ggrem} pmc`);
    if (Object.keys(pmc).length === 0) throw new Error(`${where}: ${ggrem} without PMC`);
    return {
      ggrem,
      apresentacao: str(a, "apresentacao", where),
      eans: list(a.eans, `${where} eans`).filter((e): e is string => typeof e === "string"),
      regime_preco: str(a, "regime_preco", where),
      comercializado: bool(a, "comercializado", where),
      icms_0: bool(a, "icms_0", where),
      pmc,
      pmc_alc: precos(a.pmc_alc, `${where} ${ggrem} pmc_alc`),
    };
  });
  if (apresentacoes.length === 0) throw new Error(`${where}: no apresentacoes`);
  return {
    ...parseItem({ ...o, comercializado: apresentacoes.some((a) => a.comercializado) }, where),
    cnpj: str(o, "cnpj", where),
    classe_terapeutica: strOrNull(o, "classe_terapeutica", where),
    tarja: strOrNull(o, "tarja", where),
    stamp: str(o, "stamp", where),
    publicado_em: str(o, "publicado_em", where),
    apresentacoes,
  };
}

const CONCURRENCY = 24;

export function indiceProdutosForBuild(dadosUrl: string): Promise<IndiceProdutos> {
  return once(`produtos ${dadosUrl}`, async () => parseIndiceProdutos(await getJson(`${dadosUrl}/produtos.json`)));
}

export function produtosForBuild(dadosUrl: string): Promise<Produto[]> {
  return once(`produto ${dadosUrl}`, async () => {
    const { produtos } = await indiceProdutosForBuild(dadosUrl);
    return pool(produtos, CONCURRENCY, async ({ registro_produto }) =>
      parseProduto(await getJson(`${dadosUrl}/produto/${registro_produto}.json`)),
    );
  });
}

// ---------------------------------------------------------------- URLs

export const paginaProduto = (p: { registro_produto: string; produto: string }): string =>
  `/remedios/${p.registro_produto}-${slug(p.produto)}/`;

/** Unique, stable slugs for substâncias: names are cut at 60 characters, so long ones may collide; the
 * collisions get -2, -3… in alphabetical order of the full name. */
export function slugsSubstancias(nomes: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const usados = new Map<string, number>();
  for (const nome of [...new Set(nomes)].sort((a, b) => a.localeCompare(b, "pt-BR"))) {
    const base = slug(nome) || "substancia";
    const n = (usados.get(base) ?? 0) + 1;
    usados.set(base, n);
    out.set(nome, n === 1 ? base : `${base}-${n}`);
  }
  return out;
}
