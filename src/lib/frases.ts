// Numbers into plain pt-BR sentences. Facts compared with peers, always with their base; never a score or
// a risk label of our own. "Típica" in the text is the operator in the middle of its peers (the median), and
// each `detalhe` says so in words. `tom` only drives styling and is never shown as words.
import { contar, fmtClientes, fmtDate, fmtDec, fmtInt, fmtMes, fmtPct, fmtReais, fmtTrimestre } from "./format";
import type { Idss, Operadora, PontoSerie, Reclamacoes, Ressarcimento } from "./operadoras";

export type Tom = "favoravel" | "neutro" | "desfavoravel" | "sem-base";

/** The two numbers a comparison stands on, drawn as two bars on the page. */
export interface Comparacao {
  esta: number;
  tipica: number;
  /** the end of the bar scale */
  max: number;
  casas: number;
  /** "Típica entre as 94 do mesmo tamanho" */
  rotuloTipica: string;
  /** what both numbers measure: "Reclamações por mês a cada 100 mil clientes" */
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

/** 1 complaint for every N clients in the quarter, from the monthly index per 100,000: rounded to two digits,
 * which is all the precision the reader needs ("1 para cada 400"). Null when there were none. */
export function umParaCada(indice: number): number | null {
  if (indice <= 0) return null;
  const n = 100000 / (3 * indice);
  if (n < 100) return Math.max(1, Math.round(n));
  const passo = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / passo) * passo;
}

const paraCada = (indice: number): string => {
  const n = umParaCada(indice);
  return n === null ? "nenhuma reclamação" : `1 reclamação para cada ${fmtInt(n)} ${n === 1 ? "cliente" : "clientes"}`;
};

/** How many times the typical operator's complaints, in words: "mais que o dobro", "cerca de 5 vezes". */
function vezes(razao: number): string {
  if (razao < 2.1) return "o dobro";
  if (razao < 3) return "mais que o dobro";
  if (razao < 3.1) return "o triplo";
  if (razao < 4) return "mais que o triplo";
  return `cerca de ${fmtInt(Math.floor(razao))} vezes`;
}

/** The comparison with the typical operator, short: for the title and the summary at the top of the page. */
export function comparativoReclamacoes(r: Reclamacoes): { texto: string; tom: Tom } {
  if (r.indice === null || r.mediana_mesmo_porte === null || r.mediana_mesmo_porte <= 0) {
    return { texto: "sem comparação", tom: "sem-base" };
  }
  if (r.reclamacoes < POUCAS_RECLAMACOES) return { texto: "poucas para comparar", tom: "sem-base" };
  const razao = r.indice / r.mediana_mesmo_porte;
  if (razao >= 2) return { texto: `${vezes(razao)} da típica`, tom: "desfavoravel" };
  if (razao >= 1.25) return { texto: "mais que a típica", tom: "desfavoravel" };
  if (razao > 0.8) return { texto: "no nível da típica", tom: "neutro" };
  if (razao > 0.5) return { texto: "menos que a típica", tom: "favoravel" };
  return { texto: "bem menos que a típica", tom: "favoravel" };
}

export function fraseReclamacoes(r: Reclamacoes): Frase {
  const quando = fmtTrimestre(r.trimestre);
  const contagem = `Foram ${contar(r.reclamacoes, "reclamação", "reclamações")} ${quando}, para ${fmtClientes(r.beneficiarios_media)} em média.`;
  // after the practical reading, which already names the period
  const total = `No total, foram ${contar(r.reclamacoes, "reclamação", "reclamações")} para ${fmtClientes(r.beneficiarios_media)} em média.`;
  if (r.indice === null || r.mediana_mesmo_porte === null || r.mediana_mesmo_porte <= 0) {
    return { titulo: "Sem comparação de reclamações neste trimestre.", detalhe: contagem, tom: "sem-base" };
  }
  const tipo = r.cobertura === "odontológica" ? "plano odontológico" : "plano médico-hospitalar";
  const tamanho = r.porte.toLowerCase();
  const pratica = `Na prática, ${quando}, houve ${paraCada(r.indice)} nesta operadora; na típica, ${paraCada(r.mediana_mesmo_porte).replace(" reclamação", "")}.`;
  const tipica = `A típica é a do meio entre as ${fmtInt(r.operadoras_mesmo_porte)} operadoras de ${tipo} de tamanho ${tamanho}: metade recebe mais reclamações que ela, metade recebe menos.`;
  const { texto, tom } = comparativoReclamacoes(r);
  if (r.reclamacoes < POUCAS_RECLAMACOES) {
    return {
      titulo: `Poucas reclamações no trimestre (${fmtInt(r.reclamacoes)}): números tão pequenos não dão uma comparação confiável.`,
      // no per-client reading here: with a small base it swings wildly and would look alarming for nothing
      detalhe: `${contagem} Com tão poucas reclamações, uma a mais ou a menos muda muito a conta, então o site não compara.`,
      tom,
    };
  }
  const titulos: Record<string, string> = {
    "mais que a típica": "Recebe mais reclamações que uma operadora típica do mesmo tamanho.",
    "no nível da típica": "Recebe reclamações no nível de uma operadora típica do mesmo tamanho.",
    "menos que a típica": "Recebe menos reclamações que uma operadora típica do mesmo tamanho.",
    "bem menos que a típica": "Recebe bem menos reclamações que uma operadora típica do mesmo tamanho.",
  };
  const titulo =
    titulos[texto] ??
    `Recebe ${texto.replace(" da típica", "")} das reclamações de uma operadora típica do mesmo tamanho.`;
  return {
    titulo,
    detalhe: `${pratica} ${total} ${tipica}`,
    tom,
    comparacao: {
      esta: r.indice,
      tipica: r.mediana_mesmo_porte,
      max: Math.max(r.indice, r.mediana_mesmo_porte),
      casas: 1,
      rotuloTipica: `Típica entre as ${fmtInt(r.operadoras_mesmo_porte)} do mesmo tamanho`,
      unidade: "Reclamações por mês a cada 100 mil clientes",
    },
  };
}

/** The same quarter one year earlier, when the series has it: better, worse or about the same. */
export function fraseAnoAnterior(serie: PontoSerie[]): string | null {
  const ultimo = serie.at(-1);
  if (ultimo?.indice == null) return null;
  const m = /^([1-4])T(\d{4})$/.exec(ultimo.trimestre);
  if (!m) return null;
  const antes = serie.find((p) => p.trimestre === `${m[1]}T${Number(m[2]) - 1}`);
  if (antes?.indice == null) return null;
  // a change between two tiny counts is noise, not a trend
  if (ultimo.reclamacoes < POUCAS_RECLAMACOES || antes.reclamacoes < POUCAS_RECLAMACOES) return null;
  const era = `${fmtTrimestre(antes.trimestre)}, era ${paraCada(antes.indice)}`;
  if (antes.indice > 0 && Math.abs(ultimo.indice / antes.indice - 1) < VARIACAO_PEQUENA) {
    return `Parecido com um ano antes: ${era}.`;
  }
  return ultimo.indice > antes.indice ? `Piorou em um ano: ${era}.` : `Melhorou em um ano: ${era}.`;
}

const SOBRE_IDSS =
  "A ANS dá essa nota todo ano, olhando a qualidade do atendimento, o acesso a médicos e exames, a saúde financeira e a gestão da operadora. A ANS publica a nota de 0 a 1; aqui ela aparece de 0 a 10, como uma nota de escola.";

/** The ANS score (0 to 1) on the 0-10 scale everyone knows: 0.8112 → "8,1". */
export const notaDe10 = (valor: number): string => fmtDec(valor * 10, 1);

/** The score compared with the typical one of the same kind of operator: higher is better. */
export function comparativoIdss(i: Idss | null): { texto: string; tom: Tom } {
  if (i?.valor == null) return { texto: "sem nota", tom: "sem-base" };
  const nota = `${notaDe10(i.valor)} de 10`;
  const mediana = i.mediana_mesma_modalidade;
  if (mediana === null) return { texto: nota, tom: "sem-base" };
  if (i.valor >= mediana + IDSS_FAIXA) return { texto: `${nota}, acima da típica`, tom: "favoravel" };
  if (i.valor <= mediana - IDSS_FAIXA) return { texto: `${nota}, abaixo da típica`, tom: "desfavoravel" };
  return { texto: `${nota}, no nível da típica`, tom: "neutro" };
}

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
      detalhe: `${SOBRE_IDSS} A nota não sai em alguns casos, como quando a operadora está sob intervenção da ANS ou foi fechada.`,
      tom: "sem-base",
    };
  }
  const nota = `Nota ${notaDe10(i.valor)} de 10`;
  const mediana = i.mediana_mesma_modalidade;
  const { tom } = comparativoIdss(i);
  if (mediana === null) return { titulo: `${nota}.`, detalhe: `${SOBRE_IDSS} ${ano}`, tom };
  const grupo = modalidadePlural(modalidade);
  const titulo =
    tom === "favoravel"
      ? `${nota}, acima da típica das ${grupo}.`
      : tom === "desfavoravel"
        ? `${nota}, abaixo da típica das ${grupo}.`
        : `${nota}, no nível das ${grupo}.`;
  return {
    titulo,
    detalhe: `${SOBRE_IDSS} ${ano} A típica é a do meio entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}.`,
    tom,
    comparacao: {
      esta: i.valor * 10,
      tipica: mediana * 10,
      max: 10,
      casas: 1,
      rotuloTipica: `Típica entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}`,
      unidade: "Nota de 0 a 10",
    },
  };
}

export function fraseRessarcimento(r: Ressarcimento | null): Frase | null {
  if (!r) return null;
  const sobre =
    "Quando um cliente de plano é atendido pelo SUS, a operadora tem de devolver ao SUS o custo do atendimento. Isso não muda o atendimento de quem tem o plano: mostra se a operadora paga o que deve.";
  if (r.indice_pagamento === null || !r.valor_cobrado) {
    return {
      titulo: "O SUS não cobrou nada desta operadora.",
      detalhe: `${sobre} Situação em ${fmtMes(r.competencia)}.`,
      tom: "sem-base",
    };
  }
  const pago = r.indice_pagamento;
  return {
    titulo: pago >= 100 ? "Pagou ao SUS tudo o que devia." : `Pagou ${fmtPct(pago)} do que devia ao SUS.`,
    detalhe: `${sobre} O SUS cobrou ${fmtReais(r.valor_cobrado)} desta operadora até ${fmtMes(r.competencia)}.`,
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

/** One line per subject for the top of the operator page, derived from the full sentences so the two never
 * disagree: "Reclamações: 2,2 vezes a típica". `ancora` is the id of the section with the details. */
export interface ItemResumo {
  assunto: string;
  texto: string;
  tom: Tom;
  ancora: string;
}

export function resumo(op: Pick<Operadora, "reclamacoes" | "idss" | "modalidade" | "ressarcimento">): ItemResumo[] {
  const out: ItemResumo[] = op.reclamacoes.map((r) => ({
    assunto: op.reclamacoes.length > 1 ? `Reclamações (${cobertura(r.cobertura).toLowerCase()})` : "Reclamações",
    ...comparativoReclamacoes(r),
    ancora: "reclamacoes",
  }));
  out.push({ assunto: "Nota da ANS", ...comparativoIdss(op.idss), ancora: "nota" });
  const sus = fraseRessarcimento(op.ressarcimento);
  if (sus) {
    const pago = op.ressarcimento?.indice_pagamento;
    const texto =
      pago == null || !op.ressarcimento?.valor_cobrado
        ? "nada cobrado"
        : pago >= 100
          ? "pagou tudo"
          : `pagou ${fmtPct(pago)} do que devia`;
    out.push({ assunto: "Pagamentos ao SUS", texto, tom: sus.tom, ancora: "sus" });
  }
  return out;
}
