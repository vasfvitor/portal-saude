// Plain pt-BR for the CMED prices. The price is a ceiling set by the government, never a price we quote:
// the pharmacy may charge less. Every price shown carries its ICMS rate next to it.
import { fmtMoney } from "./format";
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

export function precoMaximo(a: Apresentacao, aliquota: Aliquota): string | null {
  const c = a.pmc[aliquota];
  return c === undefined ? null : fmtMoney(c);
}

/** "De R$ 473,09 (ICMS 12%) a R$ 540,68 (ICMS 23%), conforme o estado." over the rates with a price. */
export function faixaPreco(a: Apresentacao, aliquotas: readonly Aliquota[]): string | null {
  const com = aliquotas.filter((k) => a.pmc[k] !== undefined);
  if (com.length === 0) return null;
  const precos = com.map((k) => a.pmc[k]!);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const kMin = com[precos.indexOf(min)]!;
  const kMax = com[precos.indexOf(max)]!;
  if (min === max) return `${fmtMoney(min)} (ICMS ${aliquotaRotulo(kMin)}).`;
  return `De ${fmtMoney(min)} (ICMS ${aliquotaRotulo(kMin)}) a ${fmtMoney(max)} (ICMS ${aliquotaRotulo(kMax)}), conforme o estado.`;
}

export function avisoComercializacao(comercializado: boolean): string | null {
  return comercializado
    ? null
    : "O fabricante não informou nenhuma venda deste remédio à CMED no último ano. Ele pode estar em falta ou fora das farmácias.";
}

/** "J1G1 - FLUORQUINOLONAS ORAIS" → "FLUORQUINOLONAS ORAIS": the ATC-like code means nothing to the reader. */
export const classeSemCodigo = (classe: string): string => classe.replace(/^[A-Z0-9]{2,6}\s*-\s*/, "");

export const PRECO_MAXIMO =
  "A farmácia pode cobrar até este valor, e pode cobrar menos. O teto é fixado pela CMED, o órgão do governo que regula o preço dos remédios, e muda com o ICMS de cada estado.";

export const SE_COBRAREM_MAIS =
  "Se cobrarem acima do preço máximo do seu estado, guarde a nota fiscal e procure o Procon da sua cidade.";
