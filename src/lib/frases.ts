// Numbers into plain pt-BR sentences. Facts compared with peers, always with their base; never a score or
// a risk label of our own. "Típico" in the text is the peers' median, defined in each `detalhe`. `tom` only
// drives styling and is never shown as words.
import { fmtDate, fmtDec, fmtInt, fmtPct, fmtPessoas, fmtReais } from "./format";
import type { Idss, Operadora, PontoSerie, Reclamacoes, Ressarcimento } from "./operadoras";

export type Tom = "favoravel" | "neutro" | "desfavoravel" | "sem-base";

export interface Frase {
  /** the sentence in bold: the comparison */
  titulo: string;
  /** the base: the numbers behind it */
  detalhe: string;
  tom: Tom;
}

/** below this many complaints in a quarter the index swings too much to compare */
export const POUCAS_RECLAMACOES = 10;
/** IDSS points from the median that still count as "no nível" */
export const IDSS_FAIXA = 0.05;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "3T2026" → "3º trimestre de 2026 (jul a set)". */
export function trimestre(t: string): string {
  const m = /^([1-4])T(\d{4})$/.exec(t);
  if (!m) return t;
  const q = Number(m[1]);
  return `${q}º trimestre de ${m[2]} (${MESES[(q - 1) * 3]} a ${MESES[q * 3 - 1]})`;
}

/** "3T2026" → "3º tri/26", for chart labels. */
export function trimestreCurto(t: string): string {
  const m = /^([1-4])T\d{2}(\d{2})$/.exec(t);
  return m ? `${m[1]}º tri/${m[2]}` : t;
}

export function cobertura(c: string): string {
  return c === "odontológica" ? "Plano odontológico" : "Plano médico-hospitalar";
}

const PLURAL: Record<string, string> = {
  "Medicina de Grupo": "operadoras de medicina de grupo",
  "Cooperativa Médica": "cooperativas médicas",
  "Odontologia de Grupo": "operadoras de odontologia de grupo",
  "Cooperativa odontológica": "cooperativas odontológicas",
  Autogestão: "autogestões",
  "Autogestão por RH": "autogestões por RH",
  Filantropia: "filantropias",
  "Seguradora Especializada em Saúde": "seguradoras",
};
export const modalidadePlural = (m: string): string => PLURAL[m] ?? `operadoras da modalidade ${m}`;

export function fraseReclamacoes(r: Reclamacoes): Frase {
  const porte = r.porte.toLowerCase();
  const tipo = r.cobertura === "odontológica" ? "odontológicas" : "médico-hospitalares";
  const base = `${fmtInt(r.reclamacoes)} ${r.reclamacoes === 1 ? "reclamação" : "reclamações"} na ANS no ${trimestre(r.trimestre)}, para ${fmtPessoas(r.beneficiarios_media)} beneficiários em média.`;
  if (r.indice === null || r.mediana_mesmo_porte === null || r.mediana_mesmo_porte <= 0) {
    return { titulo: "Sem comparação de reclamações neste trimestre.", detalhe: base, tom: "sem-base" };
  }
  const pares = `O plano típico (a mediana entre ${fmtInt(r.operadoras_mesmo_porte)} operadoras ${tipo} de porte ${porte}) tem ${fmtDec(r.mediana_mesmo_porte, 1)} reclamações por mês para cada 100 mil beneficiários; esta operadora, ${fmtDec(r.indice, 1)}.`;
  if (r.reclamacoes < POUCAS_RECLAMACOES) {
    return {
      titulo: "Poucas reclamações: com números tão pequenos, a comparação oscila muito.",
      detalhe: `${base} ${pares}`,
      tom: "sem-base",
    };
  }
  const razao = r.indice / r.mediana_mesmo_porte;
  const alvo = `um plano típico de porte ${porte}`;
  let titulo: string;
  let tom: Tom;
  if (razao >= 2) {
    titulo = `Recebe ${fmtDec(razao, 1)} vezes as reclamações de ${alvo}.`;
    tom = "desfavoravel";
  } else if (razao >= 1.25) {
    titulo = `Recebe mais reclamações que ${alvo}.`;
    tom = "desfavoravel";
  } else if (razao > 0.8) {
    titulo = `Recebe reclamações no nível de ${alvo}.`;
    tom = "neutro";
  } else if (razao > 0.5) {
    titulo = `Recebe menos reclamações que ${alvo}.`;
    tom = "favoravel";
  } else {
    titulo = `Recebe bem menos reclamações que ${alvo}.`;
    tom = "favoravel";
  }
  return { titulo, detalhe: `${base} ${pares}`, tom };
}

/** Same quarter one year earlier, when the series has it. */
export function fraseAnoAnterior(serie: PontoSerie[]): string | null {
  const ultimo = serie.at(-1);
  if (ultimo?.indice == null) return null;
  const m = /^([1-4])T(\d{4})$/.exec(ultimo.trimestre);
  if (!m) return null;
  const antes = serie.find((p) => p.trimestre === `${m[1]}T${Number(m[2]) - 1}`);
  if (antes?.indice == null) return null;
  return `No mesmo trimestre do ano anterior: ${fmtDec(antes.indice, 1)} (${fmtInt(antes.reclamacoes)} reclamações).`;
}

export function fraseIdss(i: Idss | null, modalidade: string): Frase {
  if (!i) {
    return {
      titulo: "A ANS não publicou o índice de desempenho (IDSS) desta operadora.",
      detalhe: "",
      tom: "sem-base",
    };
  }
  const ano = `IDSS ${i.ano}, ano-base ${i.ano_base}`;
  if (i.valor === null) {
    return {
      titulo: `Sem nota no índice de desempenho da ANS (${ano}): ${i.motivo ?? "não divulgada"}.`,
      detalhe: "A ANS não divulga a nota em algumas situações, como regime especial ou cancelamento.",
      tom: "sem-base",
    };
  }
  const mediana = i.mediana_mesma_modalidade;
  const grupo = modalidadePlural(modalidade);
  const escala = `Nota de 0 a 1, em que 1 é o melhor (${ano}).`;
  if (mediana === null) {
    return { titulo: `Nota ${fmtDec(i.valor)} no índice de desempenho da ANS.`, detalhe: escala, tom: "sem-base" };
  }
  const detalhe = `${escala} A nota típica (a mediana entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}) é ${fmtDec(mediana)}.`;
  if (i.valor >= mediana + IDSS_FAIXA) {
    return {
      titulo: `Nota ${fmtDec(i.valor)} no índice de desempenho da ANS, acima da nota típica das ${grupo}.`,
      detalhe,
      tom: "favoravel",
    };
  }
  if (i.valor <= mediana - IDSS_FAIXA) {
    return {
      titulo: `Nota ${fmtDec(i.valor)} no índice de desempenho da ANS, abaixo da nota típica das ${grupo}.`,
      detalhe,
      tom: "desfavoravel",
    };
  }
  return {
    titulo: `Nota ${fmtDec(i.valor)} no índice de desempenho da ANS, no nível das ${grupo}.`,
    detalhe,
    tom: "neutro",
  };
}

export function fraseRessarcimento(r: Ressarcimento | null): Frase | null {
  if (!r) return null;
  const mes = fmtDate(`${r.competencia}-01`).slice(3);
  if (r.indice_pagamento === null || !r.valor_cobrado) {
    return {
      titulo: "Sem cobrança de ressarcimento ao SUS registrada.",
      detalhe: `Situação em ${mes}.`,
      tom: "sem-base",
    };
  }
  const pago = r.indice_pagamento;
  return {
    titulo: `Pagou ${fmtPct(pago)} do que o SUS cobrou por atender clientes desta operadora.`,
    detalhe: `Quando um cliente de plano é atendido no SUS, a operadora deve ressarcir o SUS. Valor cobrado, acumulado até ${mes}: ${fmtReais(r.valor_cobrado)}.`,
    tom: pago >= 99.5 ? "favoravel" : pago >= 90 ? "neutro" : "desfavoravel",
  };
}

export function fraseCancelamento(o: Pick<Operadora, "cancelamento">): string | null {
  if (!o.cancelamento) return null;
  return `Registro cancelado pela ANS em ${fmtDate(o.cancelamento.data)}. Motivo: ${o.cancelamento.motivo}.`;
}

export function frasePortabilidade(o: Pick<Operadora, "portabilidade_vigente">): string | null {
  const p = o.portabilidade_vigente[0];
  if (!p) return null;
  return `A ANS liberou a portabilidade especial em ${fmtDate(p.data)} (Resolução Operacional nº ${p.ro}): os clientes desta operadora podem trocar de plano sem cumprir carência de novo.`;
}
