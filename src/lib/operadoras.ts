// Operator data from ans-feeds (`/dados/`, contract in its `schema.md`), read at build time. Every source is
// required: a fetch or validation failure fails the build, so the previous deploy stays live and no page is
// published half-filled. Validation covers what the pages read; a key change upstream fails loudly here.

export type Situacao = "ativa" | "cancelada";

export interface ItemIndice {
  registro: string;
  nome: string;
  fantasia: string | null;
  uf: string | null;
  municipio: string | null;
  modalidade: string;
  situacao: Situacao;
  beneficiarios: number | null;
}

export interface PontoSerie {
  trimestre: string;
  indice: number | null;
  reclamacoes: number;
}

export interface Reclamacoes {
  cobertura: string;
  trimestre: string;
  indice: number | null;
  reclamacoes: number;
  beneficiarios_media: number;
  porte: string;
  mediana_mesmo_porte: number | null;
  operadoras_mesmo_porte: number;
  serie: PontoSerie[];
}

export interface Idss {
  ano: number;
  ano_base: number;
  valor: number | null;
  motivo: string | null;
  dimensoes: Record<string, { nome: string; valor: number | null }>;
  mediana_mesma_modalidade: number | null;
  operadoras_mesma_modalidade: number;
}

export interface Ressarcimento {
  competencia: string;
  indice_pagamento: number | null;
  indice_pagamento_5anos: number | null;
  valor_cobrado: number | null;
  valor_pago: number | null;
}

export interface EventoCurto {
  tipo: string;
  id: string;
  data: string;
  titulo: string;
}

export interface Operadora extends ItemIndice {
  cnpj: string;
  registrada_em: string | null;
  cancelamento: { data: string; motivo: string } | null;
  reclamacoes: Reclamacoes[];
  idss: Idss | null;
  ressarcimento: Ressarcimento | null;
  portabilidade_vigente: { ro: string; data: string; link: string | null }[];
  eventos: EventoCurto[];
  fontes: Record<string, string>;
  fora: string[];
}

export interface Meta {
  date: string;
}

// ---------------------------------------------------------------- validation

type Obj = Record<string, unknown>;
const REGISTRO = /^\d{6}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function obj(v: unknown, where: string): Obj {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new Error(`${where}: not an object`);
  return v as Obj;
}
function list(v: unknown, where: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${where}: not a list`);
  return v;
}
function str(o: Obj, k: string, where: string): string {
  const v = o[k];
  if (typeof v !== "string" || v === "") throw new Error(`${where}: no ${k}`);
  return v;
}
function strOrNull(o: Obj, k: string, where: string): string | null {
  const v = o[k];
  if (v === null) return null;
  if (typeof v !== "string") throw new Error(`${where}: bad ${k}`);
  return v;
}
function num(o: Obj, k: string, where: string): number {
  const v = o[k];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${where}: no ${k}`);
  return v;
}
function numOrNull(o: Obj, k: string, where: string): number | null {
  const v = o[k];
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${where}: bad ${k}`);
  return v;
}

function parseItem(raw: unknown, where: string): ItemIndice {
  const o = obj(raw, where);
  const registro = str(o, "registro", where);
  if (!REGISTRO.test(registro)) throw new Error(`${where}: bad registro ${registro}`);
  const situacao = str(o, "situacao", where);
  if (situacao !== "ativa" && situacao !== "cancelada") throw new Error(`${where}: bad situacao ${situacao}`);
  return {
    registro,
    nome: str(o, "nome", where),
    fantasia: strOrNull(o, "fantasia", where),
    uf: strOrNull(o, "uf", where),
    municipio: strOrNull(o, "municipio", where),
    modalidade: str(o, "modalidade", where),
    situacao,
    beneficiarios: numOrNull(o, "beneficiarios", where),
  };
}

export function parseIndice(raw: unknown): ItemIndice[] {
  const itens = list(raw, "operadoras.json").map((x, i) => parseItem(x, `operadoras.json[${i}]`));
  if (itens.length === 0) throw new Error("operadoras.json: empty");
  return itens;
}

export function parseOperadora(raw: unknown): Operadora {
  const o = obj(raw, "operadora");
  const where = `operadora ${String(o.registro)}`;
  const item = parseItem(o, where);
  const cancel = o.cancelamento === null ? null : obj(o.cancelamento, `${where} cancelamento`);
  if (item.situacao === "cancelada" && !cancel) throw new Error(`${where}: cancelled without cancelamento`);
  const reclamacoes = list(o.reclamacoes, `${where} reclamacoes`).map((x): Reclamacoes => {
    const r = obj(x, `${where} reclamacoes`);
    const w = `${where} reclamacoes`;
    return {
      cobertura: str(r, "cobertura", w),
      trimestre: str(r, "trimestre", w),
      indice: numOrNull(r, "indice", w),
      reclamacoes: num(r, "reclamacoes", w),
      beneficiarios_media: num(r, "beneficiarios_media", w),
      porte: str(r, "porte", w),
      mediana_mesmo_porte: numOrNull(r, "mediana_mesmo_porte", w),
      operadoras_mesmo_porte: num(r, "operadoras_mesmo_porte", w),
      serie: list(r.serie, `${w} serie`).map((p) => {
        const s = obj(p, `${w} serie`);
        return {
          trimestre: str(s, "trimestre", w),
          indice: numOrNull(s, "indice", w),
          reclamacoes: num(s, "reclamacoes", w),
        };
      }),
    };
  });
  let idss: Idss | null = null;
  if (o.idss !== null) {
    const i = obj(o.idss, `${where} idss`);
    const w = `${where} idss`;
    const dims = obj(i.dimensoes, `${w} dimensoes`);
    idss = {
      ano: num(i, "ano", w),
      ano_base: num(i, "ano_base", w),
      valor: numOrNull(i, "valor", w),
      motivo: strOrNull(i, "motivo", w),
      dimensoes: Object.fromEntries(
        Object.entries(dims).map(([k, v]) => {
          const d = obj(v, `${w} ${k}`);
          return [k, { nome: str(d, "nome", w), valor: numOrNull(d, "valor", w) }];
        }),
      ),
      mediana_mesma_modalidade: numOrNull(i, "mediana_mesma_modalidade", w),
      operadoras_mesma_modalidade: num(i, "operadoras_mesma_modalidade", w),
    };
  }
  let ressarcimento: Ressarcimento | null = null;
  if (o.ressarcimento !== null) {
    const r = obj(o.ressarcimento, `${where} ressarcimento`);
    const w = `${where} ressarcimento`;
    ressarcimento = {
      competencia: str(r, "competencia", w),
      indice_pagamento: numOrNull(r, "indice_pagamento", w),
      indice_pagamento_5anos: numOrNull(r, "indice_pagamento_5anos", w),
      valor_cobrado: numOrNull(r, "valor_cobrado", w),
      valor_pago: numOrNull(r, "valor_pago", w),
    };
  }
  const eventos = list(o.eventos, `${where} eventos`).map((x) => {
    const e = obj(x, `${where} eventos`);
    const data = str(e, "data", where);
    if (!DIA.test(data)) throw new Error(`${where}: bad event date ${data}`);
    return { tipo: str(e, "tipo", where), id: str(e, "id", where), data, titulo: str(e, "titulo", where) };
  });
  return {
    ...item,
    cnpj: str(o, "cnpj", where),
    registrada_em: strOrNull(o, "registrada_em", where),
    cancelamento: cancel ? { data: str(cancel, "data", where), motivo: str(cancel, "motivo", where) } : null,
    reclamacoes,
    idss,
    ressarcimento,
    portabilidade_vigente: list(o.portabilidade_vigente, `${where} portabilidade_vigente`).map((x) => {
      const p = obj(x, `${where} portabilidade_vigente`);
      return { ro: str(p, "ro", where), data: str(p, "data", where), link: strOrNull(p, "link", where) };
    }),
    eventos,
    fontes: Object.fromEntries(
      Object.entries(obj(o.fontes, `${where} fontes`)).filter(
        (kv): kv is [string, string] => typeof kv[1] === "string",
      ),
    ),
    fora: list(o.fora, `${where} fora`).filter((x): x is string => typeof x === "string"),
  };
}

export function parseMeta(raw: unknown): Meta {
  const o = obj(raw, "meta.json");
  const date = str(o, "date", "meta.json");
  if (!DIA.test(date)) throw new Error(`meta.json: bad date ${date}`);
  return { date };
}

// ---------------------------------------------------------------- fetching

const RETRIES = 2;
const CONCURRENCY = 12;

/** GET JSON past the 600 s GitHub Pages cache; transport errors and 5xx are retried, 4xx fail at once. */
export async function getJson(url: string): Promise<unknown> {
  const u = new URL(url);
  u.searchParams.set("t", String(Date.now()));
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) return (await res.json()) as unknown;
      last = new Error(`HTTP ${res.status} at ${url}`);
      if (res.status < 500) break;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(`fetch failed at ${url}`);
}

/** Run `fn` over `items` with at most `limit` in flight; results keep the input order. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// one fetch per URL per build, shared by every page and endpoint
const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
  }
  return p;
}

export function indiceForBuild(dadosUrl: string): Promise<ItemIndice[]> {
  return once(`indice ${dadosUrl}`, async () => parseIndice(await getJson(`${dadosUrl}/operadoras.json`)));
}

export function operadorasForBuild(dadosUrl: string): Promise<Operadora[]> {
  return once(`operadoras ${dadosUrl}`, async () => {
    const indice = await indiceForBuild(dadosUrl);
    return pool(indice, CONCURRENCY, async ({ registro }) =>
      parseOperadora(await getJson(`${dadosUrl}/operadora/${registro}.json`)),
    );
  });
}

export function metaForBuild(metaUrl: string): Promise<Meta> {
  return once(`meta ${metaUrl}`, async () => parseMeta(await getJson(metaUrl)));
}

// ---------------------------------------------------------------- URLs

/** "BRADESCO SAÚDE S.A." → "bradesco-saude-s-a" (at most 60 characters, no dash at the ends). */
export function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
}

export const paginaOperadora = (o: { registro: string; nome: string }): string =>
  `/plano/${o.registro}-${slug(o.nome)}/`;
