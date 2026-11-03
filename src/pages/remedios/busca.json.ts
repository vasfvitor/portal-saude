// The medicine search index for Busca.astro: n product name, d detail line, t extra search text, h page path.
import type { APIRoute } from "astro";
import { CMED_DADOS_URL } from "../../lib/config";
import { quandoVenda } from "../../lib/frases-remedios";
import { anoDeVenda, indiceProdutosForBuild, paginaProduto, produtosForBuild } from "../../lib/remedios";

export const GET: APIRoute = async () => {
  const { produtos } = await indiceProdutosForBuild(CMED_DADOS_URL);
  // the index has no year: read it from the presentations, which every product page loads anyway (one fetch)
  const venda = quandoVenda(anoDeVenda((await produtosForBuild(CMED_DADOS_URL)).flatMap((p) => p.apresentacoes)));
  const itens = produtos.map((p) => ({
    n: p.produto,
    d: [p.laboratorio, p.tipo_produto, !p.comercializado && `sem venda ${venda}`].filter(Boolean).join(" · "),
    t: `${p.substancia} ${p.laboratorio}`,
    h: paginaProduto(p),
  }));
  return new Response(`${JSON.stringify(itens)}\n`, { headers: { "Content-Type": "application/json" } });
};
