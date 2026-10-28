// The same dose, form and quantity across brands: the key comes from lerApresentacao, and prices are ranked in an
// ICMS regime (see Regime in icms.ts). Within a regime the order is the same in every state, so a page ranks once
// per regime, never per state. Only presentations sold in the last year are offered as the cheaper option.
import { lerApresentacao, type ApresentacaoLida } from "./apresentacao";
import { TABELA, type Regime } from "./icms";
import { pmcAplicavel, type Apresentacao, type Produto } from "./remedios";

export const REGIMES: readonly Regime[] = ["p", "g"];

export interface Opcao {
  produto: Produto;
  apresentacao: Apresentacao;
  lida: ApresentacaoLida;
  /** centavos at the rate this product pays in the regime */
  preco: number;
}

export const ehGenerico = (p: Produto): boolean => p.tipo_produto === "Genérico";

/** What makes two presentations interchangeable: the same substância (as the CMED spells it) and the same dose,
 * form and quantity. The substância keeps two medicines with the same dose and package apart. */
export const chaveComparacao = (p: Produto, lida: ApresentacaoLida): string => `${p.substancia}|${lida.chave}`;

/** The price of a presentation of `p` in a regime, in centavos; exempt from ICMS, the 0% price everywhere. */
export const precoNoRegime = (p: Produto, a: Apresentacao, regime: Regime): number | undefined =>
  pmcAplicavel(a)[TABELA.noRegime(regime, ehGenerico(p))];

/** Presentations sold in the last year with a price in the regime, grouped by key, cheapest first. */
export function porChave(produtos: Produto[], regime: Regime): Map<string, Opcao[]> {
  const out = new Map<string, Opcao[]>();
  for (const produto of produtos) {
    for (const apresentacao of produto.apresentacoes) {
      const preco = precoNoRegime(produto, apresentacao, regime);
      const lida = lerApresentacao(apresentacao.apresentacao);
      if (!apresentacao.comercializado || preco === undefined || !lida) continue;
      const chave = chaveComparacao(produto, lida);
      const lista = out.get(chave) ?? [];
      lista.push({ produto, apresentacao, lida, preco });
      out.set(chave, lista);
    }
  }
  for (const lista of out.values()) {
    lista.sort((a, b) => a.preco - b.preco || a.produto.produto.localeCompare(b.produto.produto));
  }
  return out;
}

/** The cheapest option of another product with the same key, when it costs less than `preco`; with no `preco`
 * (the presentation itself is not on sale), the cheapest one on sale at any price. */
export function maisBarato(opcoes: Opcao[] | undefined, registro: string, preco?: number): Opcao | undefined {
  return opcoes?.find((o) => o.produto.registro_produto !== registro && (preco === undefined || o.preco < preco));
}

/** How much less, in whole percent, rounded down so it never overstates: 501,58 → 37,84 is 92. */
export const quantoMenos = (de: number, para: number): number => Math.floor((1 - para / de) * 100);
