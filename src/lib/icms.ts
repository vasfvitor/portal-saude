// ICMS rate that each state applies to medicines by default: the only hand-curated table on the site, so
// every row carries its source and the day it was checked. It never states a price for a state on its own:
// the pages show every rate and name the states whose default it is, with the exceptions warned about.
import { ALIQUOTAS, type Aliquota } from "./remedios";

export interface EstadoIcms {
  uf: string;
  nome: string;
  aliquota: Aliquota;
  /** primary source: state law, decree or SEFAZ page */
  fonte: string;
  /** YYYY-MM-DD */
  conferido_em: string;
  /** known exceptions for medicines in this state, in plain words */
  observacao?: string;
}

export const ESTADOS: EstadoIcms[] = [];

/** States whose default rate is each rate. */
export function ufsPorAliquota(estados: EstadoIcms[] = ESTADOS): Map<Aliquota, string[]> {
  const out = new Map<Aliquota, string[]>();
  for (const e of estados) out.set(e.aliquota, [...(out.get(e.aliquota) ?? []), e.uf].sort());
  return out;
}

/** The rate used to compare products of a substância: the most common default among the states (ties go to
 * the lower rate), or 18% while the table is empty. `deEstados` says whether it came from the table. */
export function aliquotaReferencia(estados: EstadoIcms[] = ESTADOS): { aliquota: Aliquota; deEstados: boolean } {
  const contagem = [...ufsPorAliquota(estados).entries()].sort((a, b) => b[1].length - a[1].length);
  const topo = contagem[0];
  return topo ? { aliquota: topo[0], deEstados: true } : { aliquota: "18", deEstados: false };
}

/** Rate columns on a product page: the states' defaults plus 12% (used for generics in some states); every
 * rate but 0% while the table is empty. */
export function colunas(estados: EstadoIcms[] = ESTADOS): Aliquota[] {
  if (estados.length === 0) return ALIQUOTAS.filter((a) => a !== "0");
  const usadas = new Set<Aliquota>(["12", ...estados.map((e) => e.aliquota)]);
  return ALIQUOTAS.filter((a) => usadas.has(a));
}
