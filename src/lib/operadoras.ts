// Operator data from ans-feeds (`/dados/`, contract in its `schema.md`), read at build time. Every source is
// required: a fetch or validation failure fails the build, so the previous deploy stays live and no page is
// published half-filled. Validation covers what the pages read; a key change upstream fails loudly here.

import { getJson, once } from "./fetch";
import { slug } from "./slug";
import {
  bool,
  conferirComIndice,
  feedOrNull,
  list,
  num,
  numOrAbsent,
  numOrNull,
  obj,
  str,
  strOrAbsent,
  strOrNull,
} from "./validar";

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

/** The RN 623/2024 complaints target in the latest quarter, by ans-feeds' arithmetic on the IGR. */
export interface MetaRn623 {
  trimestre: string;
  atingiu: boolean;
  /** coverage -> the target, complaints per month per 100,000 clients */
  meta: Record<string, number>;
  /** coverage -> the most complaints in the quarter that still meet it */
  ate_reclamacoes: Record<string, number>;
  /** the official list PDFs of that quarter, once the ANS publishes them */
  listas: string[];
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
  /** counted as paid by the ANS index: (pago + parcelado) / cobrado; null before ans-feeds published it */
  valor_parcelado: number | null;
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
  /** the operator's Atom feed on ans-feeds; its entries link to /plano/<registro>/ */
  feed: string | null;
  /** month of `beneficiarios` ("2026-09"); null on an older build of the data */
  beneficiarios_em: string | null;
  meta_rn623: MetaRn623 | null;
}

export interface Meta {
  date: string;
}

// ---------------------------------------------------------------- validation

const REGISTRO = /^\d{6}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

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
      valor_parcelado: numOrAbsent(r, "valor_parcelado", w),
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
    feed: feedOrNull(o, "feed", where),
    beneficiarios_em: strOrAbsent(o, "beneficiarios_em", where),
    meta_rn623: parseMeta623(o.meta_rn623, `${where} meta_rn623`),
  };
}

function parseMeta623(raw: unknown, where: string): MetaRn623 | null {
  if (raw === undefined || raw === null) return null;
  const m = obj(raw, where);
  const numeros = (v: unknown, k: string): Record<string, number> =>
    Object.fromEntries(
      Object.entries(obj(v, `${where} ${k}`)).map(([c, x]) => {
        if (typeof x !== "number" || !Number.isFinite(x)) throw new Error(`${where}: bad ${k} ${c}`);
        return [c, x];
      }),
    );
  return {
    trimestre: str(m, "trimestre", where),
    atingiu: bool(m, "atingiu", where),
    meta: numeros(m.meta, "meta"),
    ate_reclamacoes: numeros(m.ate_reclamacoes, "ate_reclamacoes"),
    listas: list(m.listas, `${where} listas`).filter(
      (x): x is string => typeof x === "string" && x.startsWith("https://"),
    ),
  };
}

export function parseMeta(raw: unknown): Meta {
  const o = obj(raw, "meta.json");
  const date = str(o, "date", "meta.json");
  if (!DIA.test(date)) throw new Error(`meta.json: bad date ${date}`);
  return { date };
}

// ---------------------------------------------------------------- fetching

// index fields the search, the A-Z list and the page URLs are built from: todas.json must agree on each of them
const CAMPOS_DO_INDICE = [
  "registro",
  "nome",
  "fantasia",
  "uf",
  "municipio",
  "modalidade",
  "situacao",
  "beneficiarios",
] as const;

/** Every operator in one file (todas.json), checked against the index and meta.json: the same day of data and the
 * same operators in the same order with the same index fields, so a half-deployed upstream fails the build. */
export function parseTodas(raw: unknown, indice: ItemIndice[], meta: Meta): Operadora[] {
  const o = obj(raw, "todas.json");
  const date = str(o, "date", "todas.json");
  if (date !== meta.date) throw new Error(`todas.json: date ${date}, but meta.json has ${meta.date}`);
  const ops = list(o.operadoras, "todas.json operadoras").map((x) => parseOperadora(x));
  const nomes = {
    pacote: "todas.json",
    indice: "operadoras.json",
    unidade: "operators",
    id: (x: Operadora) => x.registro,
  };
  conferirComIndice(ops, indice, CAMPOS_DO_INDICE, nomes);
  return ops;
}

export function indiceForBuild(dadosUrl: string): Promise<ItemIndice[]> {
  return once(`indice ${dadosUrl}`, async () => parseIndice(await getJson(`${dadosUrl}/operadoras.json`)));
}

// one request for ~1,340 operators: one file each is the kind of burst GitHub Pages answers with 429
export function operadorasForBuild(dadosUrl: string, metaUrl: string): Promise<Operadora[]> {
  return once(`operadoras ${dadosUrl}`, async () => {
    const [indice, todas, meta] = await Promise.all([
      indiceForBuild(dadosUrl),
      getJson(`${dadosUrl}/todas.json`),
      metaForBuild(metaUrl),
    ]);
    return parseTodas(todas, indice, meta);
  });
}

export function metaForBuild(metaUrl: string): Promise<Meta> {
  return once(`meta ${metaUrl}`, async () => parseMeta(await getJson(metaUrl)));
}

// ---------------------------------------------------------------- URLs

/** The trade name, unless it is just the legal name without accents ("BRADESCO SAUDE S.A."). */
export function nomeExibido(o: { nome: string; fantasia: string | null }): string {
  return o.fantasia && slug(o.fantasia) !== slug(o.nome) ? o.fantasia : o.nome;
}

export const paginaOperadora = (o: { registro: string; nome: string }): string =>
  `/plano/${o.registro}-${slug(o.nome)}/`;

/** Short address that redirects to the operator's page. ans-feeds links every feed entry here, so it must
 * keep working whatever happens to the slug. */
export const atalhoOperadora = (registro: string): string => `/plano/${registro}/`;
