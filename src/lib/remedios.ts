// CMED maximum consumer prices from anvisa-feeds (`/cmed/dados/`, contract in its `schema.md`), read at
// build time. Same rules as the operator data: every source is required and validated, so a contract change
// upstream fails the build instead of publishing a wrong price. Prices are in centavos, per ICMS rate.
import { getJson, once } from "./fetch";
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
  const stamp = listaStamp(o, "produtos.json");
  const produtos = list(o.produtos, "produtos.json produtos").map((x, i) => {
    const where = `produtos.json[${i}]`;
    const p = obj(x, where);
    return { ...parseItem(p, where), apresentacoes: num(p, "apresentacoes", where) };
  });
  if (produtos.length === 0) throw new Error("produtos.json: empty");
  return { stamp, publicado_em: str(o, "publicado_em", "produtos.json"), produtos };
}

// the pages turn the stamp into a date: a malformed one fails the build instead of printing a broken date
function listaStamp(o: Obj, where: string): string {
  const stamp = str(o, "stamp", where);
  if (!STAMP.test(stamp)) throw new Error(`${where}: bad stamp ${stamp}`);
  return stamp;
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
    stamp: listaStamp(o, where),
    publicado_em: str(o, "publicado_em", where),
    apresentacoes,
  };
}

// index fields the search, the A-Z list and the page URLs are built from: todos.json must agree on each of them
const CAMPOS_DO_INDICE = [
  "registro_produto",
  "produto",
  "laboratorio",
  "substancia",
  "tipo_produto",
  "comercializado",
] as const;

/** Every product in one file (todos.json), checked against the index: the same list (stamp and publication date,
 * on the file and on each product) and the same products in the same order with the same index fields, so a
 * half-deployed upstream fails the build instead of mixing two lists or linking to pages that do not exist. */
export function parseTodos(raw: unknown, indice: IndiceProdutos): Produto[] {
  const o = obj(raw, "todos.json");
  const lista = { stamp: listaStamp(o, "todos.json"), publicado_em: str(o, "publicado_em", "todos.json") };
  for (const k of ["stamp", "publicado_em"] as const)
    if (lista[k] !== indice[k]) throw new Error(`todos.json: ${k} ${lista[k]}, but produtos.json has ${indice[k]}`);
  const produtos = list(o.produtos, "todos.json produtos").map((x) => parseProduto(x));
  if (produtos.length !== indice.produtos.length)
    throw new Error(`todos.json: ${produtos.length} products, but produtos.json lists ${indice.produtos.length}`);
  produtos.forEach((p, i) => {
    const item = indice.produtos[i]!;
    const where = `todos.json[${i}] (${p.registro_produto})`;
    for (const k of ["stamp", "publicado_em"] as const)
      if (p[k] !== lista[k]) throw new Error(`${where}: ${k} ${p[k]}, but the file has ${lista[k]}`);
    for (const k of CAMPOS_DO_INDICE)
      if (p[k] !== item[k]) throw new Error(`${where}: ${k} ${String(p[k])}, but produtos.json has ${String(item[k])}`);
    if (p.apresentacoes.length !== item.apresentacoes)
      throw new Error(`${where}: ${p.apresentacoes.length} apresentacoes, but produtos.json has ${item.apresentacoes}`);
  });
  return produtos;
}

export function indiceProdutosForBuild(dadosUrl: string): Promise<IndiceProdutos> {
  return once(`produtos ${dadosUrl}`, async () => parseIndiceProdutos(await getJson(`${dadosUrl}/produtos.json`)));
}

// one request for ~7,600 products: one file each made GitHub Pages answer 429 mid-build
export function produtosForBuild(dadosUrl: string): Promise<Produto[]> {
  return once(`produto ${dadosUrl}`, async () => {
    const [indice, todos] = await Promise.all([indiceProdutosForBuild(dadosUrl), getJson(`${dadosUrl}/todos.json`)]);
    return parseTodos(todos, indice);
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
