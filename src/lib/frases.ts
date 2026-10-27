// Numbers into plain pt-BR sentences. Facts compared with peers, always with their base; never a score or
// a risk label of our own. "Típica" in the text is the operator in the middle of its peers (the median), and
// each `detalhe` says so in words. `tom` only drives styling and is never shown as words.
import { fmtClientes, fmtDate, fmtDec, fmtInt, fmtMes, fmtPct, fmtReais, fmtTrimestre } from "./format";
import type { Idss, Operadora, PontoSerie, Reclamacoes, Ressarcimento } from "./operadoras";

export type Tom = "favoravel" | "neutro" | "desfavoravel" | "sem-base";

/** The two numbers a comparison stands on, drawn as two bars on the page. */
export interface Comparacao {
  esta: number;
  tipica: number;
  /** the end of the bar scale */
  max: number;
  casas: number;
  /** "típica entre as 94 de porte grande" */
  rotuloTipica: string;
  /** what both numbers measure: "reclamações por mês a cada 100 mil clientes" */
  unidade: string;
}

export interface Frase {
  /** the sentence in bold: the comparison */
  titulo: string;
  /** the base: the numbers behind it, and what "típica" means */
  detalhe: string;
  tom: Tom;
  comparacao?: Comparacao;
}

/** below this many complaints in a quarter the index swings too much to compare */
export const POUCAS_RECLAMACOES = 10;
/** IDSS points from the median that still count as "no nível" */
export const IDSS_FAIXA = 0.05;
/** a change under this share, year on year, reads as "parecido" */
const VARIACAO_PEQUENA = 0.1;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "3T2026" → "3º trimestre de 2026 (jul a set)". */
export function trimestre(t: string): string {
  const m = /^([1-4])T(\d{4})$/.exec(t);
  if (!m) return t;
  const q = Number(m[1]);
  return `${q}º trimestre de ${m[2]} (${MESES[(q - 1) * 3]} a ${MESES[q * 3 - 1]})`;
}

/** "3T2026" → "jul-set/26", for chart labels. */
export function trimestreCurto(t: string): string {
  const m = /^([1-4])T\d{2}(\d{2})$/.exec(t);
  if (!m) return t;
  const q = Number(m[1]);
  return `${MESES[(q - 1) * 3]}-${MESES[q * 3 - 1]}/${m[2]}`;
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

const reclamacoesN = (n: number): string => `${fmtInt(n)} ${n === 1 ? "reclamação" : "reclamações"}`;

export function fraseReclamacoes(r: Reclamacoes): Frase {
  const porte = r.porte.toLowerCase();
  const tipo = r.cobertura === "odontológica" ? "plano odontológico" : "plano médico-hospitalar";
  const base = `${reclamacoesN(r.reclamacoes)} na ANS ${fmtTrimestre(r.trimestre)}, para ${fmtClientes(r.beneficiarios_media)} em média.`;
  if (r.indice === null || r.mediana_mesmo_porte === null || r.mediana_mesmo_porte <= 0) {
    return { titulo: "Sem comparação de reclamações neste trimestre.", detalhe: base, tom: "sem-base" };
  }
  const tipica = `A operadora típica é a do meio entre as ${fmtInt(r.operadoras_mesmo_porte)} de ${tipo} de porte ${porte}: metade recebe mais reclamações que ela, metade recebe menos.`;
  if (r.reclamacoes < POUCAS_RECLAMACOES) {
    return {
      titulo: "Poucas reclamações no trimestre: com números tão pequenos, a comparação não diz muito.",
      detalhe: `${base} Por mês, a cada 100 mil clientes: ${fmtDec(r.indice, 1)} nesta operadora e ${fmtDec(r.mediana_mesmo_porte, 1)} na típica do mesmo porte.`,
      tom: "sem-base",
    };
  }
  const razao = r.indice / r.mediana_mesmo_porte;
  const alvo = "uma operadora típica do mesmo porte";
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
  return {
    titulo,
    detalhe: `${base} ${tipica}`,
    tom,
    comparacao: {
      esta: r.indice,
      tipica: r.mediana_mesmo_porte,
      max: Math.max(r.indice, r.mediana_mesmo_porte),
      casas: 1,
      rotuloTipica: `típica entre as ${fmtInt(r.operadoras_mesmo_porte)} de porte ${porte}`,
      unidade: "reclamações por mês a cada 100 mil clientes",
    },
  };
}

/** The same quarter one year earlier, when the series has it: up, down or about the same. */
export function fraseAnoAnterior(serie: PontoSerie[]): string | null {
  const ultimo = serie.at(-1);
  if (ultimo?.indice == null) return null;
  const m = /^([1-4])T(\d{4})$/.exec(ultimo.trimestre);
  if (!m) return null;
  const antes = serie.find((p) => p.trimestre === `${m[1]}T${Number(m[2]) - 1}`);
  if (antes?.indice == null) return null;
  const quando = `${fmtDec(antes.indice, 1)} ${fmtTrimestre(antes.trimestre)}`;
  if (antes.indice > 0 && Math.abs(ultimo.indice / antes.indice - 1) < VARIACAO_PEQUENA) {
    return `Parecido com um ano antes: eram ${quando}.`;
  }
  return ultimo.indice > antes.indice ? `Subiu em um ano: eram ${quando}.` : `Caiu em um ano: eram ${quando}.`;
}

const SOBRE_IDSS =
  "A ANS dá essa nota todo ano, de 0 a 1, olhando a qualidade do atendimento, o acesso aos serviços, a saúde financeira e a gestão da operadora.";

export function fraseIdss(i: Idss | null, modalidade: string): Frase {
  if (!i) {
    return {
      titulo: "A ANS não publicou nota de desempenho para esta operadora.",
      detalhe: SOBRE_IDSS,
      tom: "sem-base",
    };
  }
  const ano = `Esta é a nota de ${i.ano}, sobre o ano de ${i.ano_base}.`;
  if (i.valor === null) {
    return {
      titulo: `Sem nota de desempenho em ${i.ano}: ${i.motivo ?? "a ANS não divulgou"}.`,
      detalhe: `${SOBRE_IDSS} Ela não é divulgada em alguns casos, como quando a operadora está sob intervenção da ANS ou foi fechada.`,
      tom: "sem-base",
    };
  }
  const nota = `Nota ${fmtDec(i.valor)} de 1`;
  const mediana = i.mediana_mesma_modalidade;
  if (mediana === null) {
    return { titulo: `${nota}.`, detalhe: `${SOBRE_IDSS} ${ano}`, tom: "sem-base" };
  }
  const grupo = modalidadePlural(modalidade);
  const detalhe = `${SOBRE_IDSS} ${ano} A típica é a do meio entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}.`;
  const comparacao: Comparacao = {
    esta: i.valor,
    tipica: mediana,
    max: 1,
    casas: 2,
    rotuloTipica: `típica entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}`,
    unidade: "nota de 0 a 1",
  };
  if (i.valor >= mediana + IDSS_FAIXA) {
    return { titulo: `${nota}, acima da típica das ${grupo}.`, detalhe, tom: "favoravel", comparacao };
  }
  if (i.valor <= mediana - IDSS_FAIXA) {
    return { titulo: `${nota}, abaixo da típica das ${grupo}.`, detalhe, tom: "desfavoravel", comparacao };
  }
  return { titulo: `${nota}, no nível das ${grupo}.`, detalhe, tom: "neutro", comparacao };
}

export function fraseRessarcimento(r: Ressarcimento | null): Frase | null {
  if (!r) return null;
  const sobre =
    "Quando um cliente de plano é atendido pelo SUS, a operadora tem de devolver ao SUS o custo do atendimento.";
  if (r.indice_pagamento === null || !r.valor_cobrado) {
    return {
      titulo: "Nenhuma cobrança do SUS registrada para esta operadora.",
      detalhe: `${sobre} Situação em ${fmtMes(r.competencia)}.`,
      tom: "sem-base",
    };
  }
  const pago = r.indice_pagamento;
  return {
    titulo: `Pagou ${fmtPct(pago)} do que devia ao SUS.`,
    detalhe: `${sobre} Valor cobrado desta operadora até ${fmtMes(r.competencia)}: ${fmtReais(r.valor_cobrado)}.`,
    tom: pago >= 100 ? "favoravel" : pago >= 90 ? "neutro" : "desfavoravel",
  };
}

// The cancellation reasons as the ANS writes them, in plain words. An unknown reason is shown as written.
const MOTIVOS: Record<string, string> = {
  "pedido de cancelamento": "a própria operadora pediu para sair do mercado",
  "pedido de cancelamento pós cisão e incorp. operação de plano":
    "a operadora pediu para sair depois de passar os planos para outra empresa",
  "alternat. à liquidação - deliberação de diretoria colegiada":
    "a diretoria da ANS cancelou o registro em vez de abrir uma liquidação",
  "liquidação extrajudicial": "a ANS mandou fechar a operadora por problemas financeiros (liquidação extrajudicial)",
  "por incorporação": "a operadora foi incorporada por outra empresa",
  "inexistência de produto ativo por mais de 180 dias": "a operadora ficou mais de 180 dias sem nenhum plano à venda",
  "ausência de solicitação de registro de produto": "a operadora não registrou nenhum plano na ANS",
  "baixa de inscrição no cnpj": "o CNPJ da operadora foi encerrado",
};

/** The reason in plain words, or the original when it is not in the table. */
export function motivoCancelamento(motivo: string): string {
  const k = motivo.trim().toLowerCase();
  const rn = /^descumprimento da (rn nº [\d./]+)$/i.exec(motivo.trim());
  if (rn) return `a operadora descumpriu uma norma da ANS (${rn[1]!.toUpperCase().replace("Nº", "nº")})`;
  return MOTIVOS[k] ?? motivo;
}

export function fraseCancelamento(o: Pick<Operadora, "cancelamento">): string | null {
  if (!o.cancelamento) return null;
  const { data, motivo } = o.cancelamento;
  const simples = motivoCancelamento(motivo);
  const original = simples === motivo ? "" : ` Motivo registrado na ANS: “${motivo}”.`;
  return `Registro cancelado em ${fmtDate(data)}: ${simples}.${original}`;
}

export function frasePortabilidade(o: Pick<Operadora, "portabilidade_vigente">): string | null {
  const p = o.portabilidade_vigente[0];
  if (!p) return null;
  return `Os clientes desta operadora podem trocar de plano sem cumprir carência de novo: a ANS liberou a portabilidade especial em ${fmtDate(p.data)} (Resolução Operacional nº ${p.ro}).`;
}
