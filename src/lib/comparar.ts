// The same dose, form and quantity across brands: the key comes from lerApresentacao, and prices are compared at
// one ICMS rate (every product's price moves the same way from rate to rate, so the order holds in any state).
// Only presentations sold in the last year are offered as the cheaper option.
import { lerApresentacao } from "./apresentacao";
import type { Aliquota, Apresentacao, Produto } from "./remedios";

export interface Opcao {
  produto: Produto;
  apresentacao: Apresentacao;
  /** centavos at the comparison rate */
  preco: number;
}

/** Presentations sold in the last year with a price at `aliquota`, grouped by key, cheapest first. */
export function porChave(produtos: Produto[], aliquota: Aliquota): Map<string, Opcao[]> {
  const out = new Map<string, Opcao[]>();
  for (const produto of produtos) {
    for (const apresentacao of produto.apresentacoes) {
      const preco = apresentacao.pmc[aliquota];
      const lida = lerApresentacao(apresentacao.apresentacao);
      if (!apresentacao.comercializado || preco === undefined || !lida) continue;
      out.set(lida.chave, [...(out.get(lida.chave) ?? []), { produto, apresentacao, preco }]);
    }
  }
  for (const lista of out.values())
    lista.sort((a, b) => a.preco - b.preco || a.produto.produto.localeCompare(b.produto.produto));
  return out;
}

/** The cheapest option of another product with the same key, when it costs less than `preco`. */
export function maisBarato(opcoes: Opcao[] | undefined, registro: string, preco: number): Opcao | undefined {
  return opcoes?.find((o) => o.produto.registro_produto !== registro && o.preco < preco);
}

/** How much less, in whole percent, rounded down so it never overstates: 501,58 → 37,84 is 92. */
export const quantoMenos = (de: number, para: number): number => Math.floor((1 - para / de) * 100);
