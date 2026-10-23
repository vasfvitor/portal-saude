// The medicine search index for Busca.astro: n product name, d detail line, t extra search text, h page path.
import type { APIRoute } from "astro";
import { CMED_DADOS_URL } from "../../lib/config";
import { indiceProdutosForBuild, paginaProduto } from "../../lib/remedios";

export const GET: APIRoute = async () => {
  const { produtos } = await indiceProdutosForBuild(CMED_DADOS_URL);
  const itens = produtos.map((p) => ({
    n: p.produto,
    d: [p.laboratorio, p.tipo_produto, !p.comercializado && "sem venda no último ano"].filter(Boolean).join(" · "),
    t: `${p.substancia} ${p.laboratorio}`,
    h: paginaProduto(p),
  }));
  return new Response(`${JSON.stringify(itens)}\n`, { headers: { "Content-Type": "application/json" } });
};
