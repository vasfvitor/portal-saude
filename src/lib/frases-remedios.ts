// Plain pt-BR for the CMED prices. The price is a ceiling set by the government, never a price we quote:
// the pharmacy may charge less. Every price shown carries its ICMS rate next to it.
import { fmtDate, fmtMes, fmtMoney } from "./format";
import { TABELA } from "./icms";
import type { Aliquota, Apresentacao, Medida, Produto } from "./remedios";

const TIPOS: Record<string, string> = {
  Genérico: "Genérico: mesma substância, dose e forma do remédio de referência, vendido pelo nome da substância.",
  Similar: "Similar: mesma substância do remédio de referência, vendido com nome comercial (marca).",
  Novo: "Novo: medicamento inovador, em geral o de referência para os genéricos e similares da mesma substância.",
  Específico: "Específico: categoria da ANVISA para produtos como soros, vitaminas e soluções.",
  Biológico: "Biológico: feito a partir de organismos vivos, como vacinas, insulinas e anticorpos.",
  Fitoterápico: "Fitoterápico: feito a partir de plantas medicinais.",
};
export const tipoExplicado = (tipo: string | null): string | null => (tipo ? (TIPOS[tipo] ?? null) : null);

const TARJAS: Record<string, string> = {
  "Tarja Vermelha": "Tarja vermelha: venda com receita médica.",
  "Tarja Vermelha sob restrição": "Tarja vermelha sob restrição: venda com receita, que fica retida na farmácia.",
  "Tarja Preta": "Tarja preta: venda com receita especial, que fica retida na farmácia.",
  "Tarja Sem Tarja": "Sem tarja: venda sem receita.",
};
export const tarjaExplicada = (tarja: string | null): string | null => (tarja ? (TARJAS[tarja] ?? null) : null);

/** "18" → "18%"; "17.5" → "17,5%". */
export const aliquotaRotulo = (a: string): string => `${a.replace(".", ",")}%`;

export function precoMaximo(pmc: Apresentacao["pmc"], aliquota: Aliquota): string | null {
  const c = pmc[aliquota];
  return c === undefined ? null : fmtMoney(c);
}

/** The prices the "seu estado" picker swaps in (`data-precos`): rate → "R$ 507,70", only rates some state uses. */
export const precosPorAliquota = (pmc: Apresentacao["pmc"]): string =>
  JSON.stringify(
    Object.fromEntries(TABELA.usadas.flatMap((k) => (pmc[k] === undefined ? [] : [[k, fmtMoney(pmc[k])]]))),
  );

/** "Entre R$ 501,58 e R$ 540,68, dependendo do estado." over the rates with a price. */
export function faixaPreco(a: Apresentacao, aliquotas: readonly Aliquota[]): string | null {
  const com = aliquotas.filter((k) => a.pmc[k] !== undefined);
  if (com.length === 0) return null;
  const precos = com.map((k) => a.pmc[k]!);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  if (min === max) return `${fmtMoney(min)} em todos os estados.`;
  return `Entre ${fmtMoney(min)} e ${fmtMoney(max)}, dependendo do estado.`;
}

export function avisoComercializacao(comercializado: boolean): string | null {
  return comercializado
    ? null
    : "O fabricante não informou nenhuma venda deste remédio à CMED no último ano. Ele pode estar em falta ou fora das farmácias.";
}

/** "J1G1 - FLUORQUINOLONAS ORAIS" → "FLUORQUINOLONAS ORAIS": the ATC-like code means nothing to the reader. */
export const classeSemCodigo = (classe: string): string => classe.replace(/^[A-Z0-9]{2,6}\s*-\s*/, "");

export const PRECO_MAXIMO =
  "O preço máximo é o teto que a farmácia pode cobrar; ela pode cobrar menos. Quem fixa o teto é a CMED, o órgão do governo que regula o preço dos remédios, e ele muda com o ICMS de cada estado.";

/** When a page offers a cheaper product: what the law lets the pharmacist do (Lei 9.787/1999), and nothing more. */
export const TROCA_NA_FARMACIA =
  "Pela lei, o farmacêutico pode trocar o remédio de referência pelo genérico com a mesma substância e dose, se o médico não tiver proibido na receita. Para qualquer outra troca, pergunte ao farmacêutico ou ao médico.";

/** The registration line in "Sobre este remédio"; null when the data does not say. */
export function fraseRegistro(registro: string, s: Produto["situacao"]): string {
  if (!s) return `Registro na ANVISA: ${registro}`;
  if (!s.ativo) return `Registro na ANVISA: ${registro}, inativo`;
  return s.vencimento
    ? `Registro na ANVISA: ${registro}, ativo, válido até ${fmtMes(s.vencimento)}`
    : `Registro na ANVISA: ${registro}, ativo`;
}

/** The warning at the top of a product whose registration is inactive but which is still on the price list. */
export const REGISTRO_INATIVO =
  "O registro deste remédio está inativo na ANVISA, mas ele ainda aparece na lista de preços da CMED. Se você usa este remédio, pergunte ao farmacêutico ou ao médico se ele continua à venda.";

const juntar = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`;

/** "06/10/2026: recolhimento e suspensão de comercialização, distribuição e uso, a pedido da própria empresa."
 * "Voluntário" is how ANVISA marks a recall the company started; it is said in words, not listed. */
export function fraseMedida(m: Medida): string {
  const acoes = juntar(m.acoes.map((a) => a.toLowerCase()));
  const voluntario = m.atividades.includes("Voluntário");
  const atividades = juntar(m.atividades.filter((a) => a !== "Voluntário").map((a) => a.toLowerCase()));
  const sobre = atividades ? ` de ${atividades}` : "";
  return `${fmtDate(m.data)}: ${acoes}${sobre}${voluntario ? ", a pedido da própria empresa" : ""}.`;
}

/** Below the list of measures: the source has no lot number. */
export const MEDIDAS_SEM_LOTE =
  "A ANVISA publica essas medidas sem o lote nos dados abertos: uma medida pode valer só para alguns lotes, não para o remédio todo. Se você tem uma caixa em casa, mostre o número do lote ao farmacêutico.";

/** Next to the list date on the medicine pages: when the prices change next. */
export const ATUALIZACAO_CMED =
  "A CMED publica uma lista nova quando muda algum preço, em geral uma vez por mês; o site é refeito todo dia e mostra a nova no máximo um dia depois.";

/** A presentation exempt from ICMS: one ceiling for the whole country, so no line per state. */
export const isentoDeIcms = (preco: string): string =>
  `Isento de ICMS: o teto é o mesmo em todos os estados, até ${preco}.`;

/** A presentation the CMED list marks hospital-only but still prices. */
export const USO_HOSPITALAR =
  "A lista da CMED marca esta dose e embalagem como de uso restrito a hospitais: ela não é vendida em farmácia. Para usar, fale com o médico ou com o hospital.";

export const SE_COBRAREM_MAIS =
  "Se cobrarem acima do preço máximo do seu estado, guarde a nota fiscal e procure o Procon da sua cidade.";

/** "Acompanhar" box on a product or substância page: the anvisa-feeds feed covers every product with the substância. */
export const acompanharSubstancia = (substancia: string): string =>
  `O feed avisa quando a lista mensal da CMED muda o preço máximo de algum remédio com ${substancia}, inclui uma dose e embalagem nova ou retira uma.`;
