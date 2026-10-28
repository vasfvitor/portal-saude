// Plain pt-BR for the CMED prices. The price is a ceiling set by the government, never a price we quote:
// the pharmacy may charge less. Every price shown carries its ICMS rate next to it.
import { fmtMoney } from "./format";
import { TABELA } from "./icms";
import type { Aliquota, Apresentacao } from "./remedios";

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

export const SE_COBRAREM_MAIS =
  "Se cobrarem acima do preço máximo do seu estado, guarde a nota fiscal e procure o Procon da sua cidade.";

/** "Acompanhar" box on a product or substância page: the anvisa-feeds feed covers every product with the substância. */
export const acompanharSubstancia = (substancia: string): string =>
  `O feed avisa quando a lista mensal da CMED muda o preço máximo de algum remédio com ${substancia}, inclui uma dose e embalagem nova ou retira uma.`;
