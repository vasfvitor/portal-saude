// Numbers into plain pt-BR sentences. Facts compared with peers, always with their base; never a score or
// a risk label of our own. "Típica" in the text is the operator in the middle of its peers (the median), and
// each `explica` says so in words. `tom` only drives styling and is never shown as words.
import { contar, fmtClientes, fmtDate, fmtDec, fmtInt, fmtMes, fmtPct, fmtReais, fmtTrimestre } from "./format";
import type { Idss, MetaRn623, Operadora, PontoSerie, Reclamacoes, Ressarcimento } from "./operadoras";

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
  /** this operator's numbers behind it; empty when there are none */
  detalhe: string;
  /** what the measure is and what "típica" means: the same on every page, so the page shows it closed */
  explica?: { pergunta: string; texto: string };
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
    detalhe: `${pratica} ${total}`,
    explica: { pergunta: "O que é a operadora típica?", texto: tipica },
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

/** The RN 623 complaints target in the latest quarter, as one sentence with its limits and where the number
 * comes from. The ANS list itself comes out weeks after the quarter; the page links it once it exists. */
export function fraseMetaRn623(m: MetaRn623): string {
  const limites = Object.keys(m.meta)
    .map(
      (c) =>
        `${c === "odontológica" ? "plano odontológico" : "plano médico-hospitalar"} até ${fmtDec(m.meta[c]!, 1)} reclamações por mês para cada 100 mil clientes, ou até ${fmtInt(m.ate_reclamacoes[c]!)} no trimestre`,
    )
    .join("; ");
  const resultado = m.atingiu ? "ficou dentro" : "ficou fora";
  const lista = m.listas.length
    ? "A ANS já publicou a lista oficial deste trimestre."
    : "A ANS publica a lista oficial algumas semanas depois do fim do trimestre.";
  return `Meta de reclamações da ANS (RN 623/2024): ${fmtTrimestre(m.trimestre)}, a operadora ${resultado} da meta (${limites}). A conta é deste site, com os números da ANS. ${lista}`;
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

/** Next to the collection date on the operator pages: when the numbers change next. */
export const ATUALIZACAO_ANS = "A página é refeita todo dia com o que a ANS publicou.";

/** "Acompanhar" boxes: what a feed reader is, said once, for people who never used one. */
export const LEITOR_DE_FEED =
  "Um leitor de feed (Feedly, Inoreader, NetNewsWire, Thunderbird) junta as novidades de vários sites num lugar só. Para usar, copie o endereço do link abaixo e cole no leitor.";

export const ACOMPANHAR_OPERADORA =
  "O feed avisa quando a ANS publica algo novo sobre esta operadora: as reclamações de cada trimestre, a nota anual, um cancelamento, um regime especial ou uma portabilidade.";

const SOBRE_IDSS =
  "A ANS avalia cada operadora todo ano: qualidade do atendimento, acesso a médicos e exames, saúde financeira e gestão.";
const explicaIdss = (texto = SOBRE_IDSS) => ({ pergunta: "Como a ANS dá a nota?", texto });

/** The ANS score as the ANS publishes it, 0 to 1: 0.8112 → "0,81". */
export const nota = (valor: number): string => fmtDec(valor);

/** The score compared with the typical one of the same kind of operator: higher is better. */
export function comparativoIdss(i: Idss | null): { texto: string; tom: Tom } {
  if (i?.valor == null) return { texto: "sem nota", tom: "sem-base" };
  const valor = nota(i.valor);
  const mediana = i.mediana_mesma_modalidade;
  if (mediana === null) return { texto: valor, tom: "sem-base" };
  if (i.valor >= mediana + IDSS_FAIXA) return { texto: `${valor}, acima da típica`, tom: "favoravel" };
  if (i.valor <= mediana - IDSS_FAIXA) return { texto: `${valor}, abaixo da típica`, tom: "desfavoravel" };
  return { texto: `${valor}, no nível da típica`, tom: "neutro" };
}

export function fraseIdss(i: Idss | null, modalidade: string): Frase {
  if (!i) {
    return {
      titulo: "A ANS não publicou nota de desempenho para esta operadora.",
      detalhe: "",
      explica: explicaIdss(),
      tom: "sem-base",
    };
  }
  const ano = `Esta é a nota de ${i.ano}, referente a ${i.ano_base}.`;
  if (i.valor === null) {
    return {
      titulo: `Sem nota de desempenho em ${i.ano}: ${i.motivo ?? "a ANS não divulgou"}.`,
      detalhe: "A nota não sai em alguns casos, como quando a operadora está sob intervenção da ANS ou foi fechada.",
      explica: explicaIdss(),
      tom: "sem-base",
    };
  }
  const titNota = `Nota ${nota(i.valor)}`;
  const mediana = i.mediana_mesma_modalidade;
  const { tom } = comparativoIdss(i);
  if (mediana === null) return { titulo: `${titNota}.`, detalhe: ano, explica: explicaIdss(), tom };
  const grupo = modalidadePlural(modalidade);
  const titulo =
    tom === "favoravel"
      ? `${titNota}, acima da típica das ${grupo}.`
      : tom === "desfavoravel"
        ? `${titNota}, abaixo da típica das ${grupo}.`
        : `${titNota}, no nível das ${grupo}.`;
  return {
    titulo,
    detalhe: ano,
    explica: explicaIdss(
      `${SOBRE_IDSS} A típica é a do meio entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}: metade tem nota maior, metade menor.`,
    ),
    tom,
    comparacao: {
      esta: i.valor,
      tipica: mediana,
      max: 1,
      casas: 2,
      rotuloTipica: `Típica entre ${fmtInt(i.operadoras_mesma_modalidade)} ${grupo}`,
      unidade: "Nota de 0 a 1, como a ANS publica",
    },
  };
}

export function fraseRessarcimento(r: Ressarcimento | null): Frase | null {
  if (!r) return null;
  const explica = {
    pergunta: "O que são os pagamentos ao SUS?",
    texto:
      "Quando um cliente de plano é atendido pelo SUS, a operadora tem de devolver ao SUS o custo do atendimento. Mostra se a operadora paga o que deve; não afeta o atendimento de quem tem o plano.",
  };
  if (r.indice_pagamento === null || !r.valor_cobrado) {
    return {
      titulo: "O SUS não cobrou nada desta operadora.",
      detalhe: `Situação em ${fmtMes(r.competencia)}.`,
      explica,
      tom: "sem-base",
    };
  }
  // The ANS index counts an instalment agreement as paid: (pago + parcelado) / cobrado.
  const pago = r.indice_pagamento;
  const parcelado = r.valor_parcelado ? ` Desse total, ${fmtReais(r.valor_parcelado)} foram parcelados.` : "";
  // The ANS does not publish how much of the rest the operator is contesting.
  const falta =
    pago >= 100
      ? ""
      : " A ANS não informa quanto do que falta a operadora contesta: parte pode estar em discussão na própria ANS ou na Justiça.";
  return {
    titulo:
      pago >= 100
        ? "Pagou ou parcelou tudo o que o SUS cobrou."
        : `Pagou ou parcelou ${fmtPct(pago)} do que o SUS cobrou.`,
    detalhe: `O SUS cobrou ${fmtReais(r.valor_cobrado)} desta operadora até ${fmtMes(r.competencia)}.${parcelado}${falta}`,
    explica,
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

// "Sinais de dificuldade": facts that come before an operator closes, never a forecast. A loss of 20% of the
// clients in a year, counted from 1,000 clients: of the operators that went into liquidation (or its
// alternative) since 2020 with that many clients, 10 of 15 had lost that much in the year before; of all
// operators of that size in 2026-09, 35 of 792 had (measured on 2026-10-28 with the IGR and the CADOP).
const PERDA_DE_CLIENTES = 0.2;
const CLIENTES_PARA_COMPARAR = 1000;
const ANOS_DE_DIRECAO_TECNICA = 3;

const mesAntes = (anoMes: string, meses: number): string => {
  const [ano, mes] = anoMes.split("-").map(Number) as [number, number];
  const n = ano * 12 + mes - 1 - meses;
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`;
};

/** One short fact per sign, for an active operator; empty when there is none. `dia` is the data's date. */
export function sinaisDeDificuldade(
  op: Pick<
    Operadora,
    "situacao" | "beneficiarios" | "beneficiarios_em" | "beneficiarios_ano_antes" | "eventos" | "portabilidade_vigente"
  >,
  dia: string,
): string[] {
  if (op.situacao !== "ativa") return [];
  const sinais: string[] = [];
  const { beneficiarios: agora, beneficiarios_ano_antes: antes, beneficiarios_em: em } = op;
  if (agora !== null && antes !== null && em && antes >= CLIENTES_PARA_COMPARAR) {
    // compared as counts: 1 - 8000/10000 is 0.19999… in floating point
    if (agora <= antes * (1 - PERDA_DE_CLIENTES)) {
      sinais.push(
        `Perdeu ${Math.round((1 - agora / antes) * 100)}% dos clientes em 12 meses: eram ${fmtClientes(antes)} em ${fmtMes(mesAntes(em, 12))} e são ${fmtClientes(agora)} em ${fmtMes(em)}.`,
      );
    }
  }
  const desde = `${Number(dia.slice(0, 4)) - ANOS_DE_DIRECAO_TECNICA}${dia.slice(4)}`;
  const direcao = op.eventos.filter((e) => e.tipo === "direcao-tecnica" && e.data >= desde).map((e) => fmtDate(e.data));
  if (direcao.length > 0) {
    sinais.push(`A ANS pôs a operadora sob direção técnica em ${direcao.join(" e em ")}.`);
  }
  if (op.portabilidade_vigente.length > 0) {
    sinais.push("A ANS liberou a troca de plano sem carência para os clientes (quadro acima).");
  }
  return sinais;
}

export const SINAIS_CONTEXTO =
  "Nenhum destes sinais quer dizer que a operadora vai fechar. Quem decide uma intervenção, como direção fiscal ou liquidação, é a ANS, e ela publica cada decisão.";

export const SINAIS_O_QUE_FAZER =
  "Se você tem plano com ela, guarde os comprovantes de pagamento. Se a ANS liberar a troca sem carência, você tem um prazo para pedir.";

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
          ? "pagou ou parcelou tudo"
          : `pagou ou parcelou ${fmtPct(pago)} do que foi cobrado`;
    out.push({ assunto: "Pagamentos ao SUS", texto, tom: sus.tom, ancora: "sus" });
  }
  return out;
}
