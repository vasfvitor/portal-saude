// The operator search index for Busca.astro: n name shown, d detail line, t extra search text, h page path.
import type { APIRoute } from "astro";
import { DADOS_URL } from "../../lib/config";
import { indiceForBuild, nomeExibido, paginaOperadora } from "../../lib/operadoras";

export const GET: APIRoute = async () => {
  const indice = await indiceForBuild(DADOS_URL);
  const itens = indice.map((o) => {
    const n = nomeExibido(o);
    const local = o.municipio && o.uf ? `${o.municipio}/${o.uf}` : o.uf;
    return {
      n,
      d: [local, `registro ${o.registro}`, o.situacao === "cancelada" && "cancelada"].filter(Boolean).join(" · "),
      t: [n !== o.nome && o.nome, o.municipio, o.uf, o.registro].filter(Boolean).join(" "),
      h: paginaOperadora(o),
    };
  });
  return new Response(`${JSON.stringify(itens)}\n`, { headers: { "Content-Type": "application/json" } });
};
