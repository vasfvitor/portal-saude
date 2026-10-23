// The search index the client script loads on first focus: short keys keep it small.
// r registro, n name shown, o other name (legal name when the shown one is the trade name), m city, u state,
// c 1 when cancelled, h page path.
import type { APIRoute } from "astro";
import { DADOS_URL } from "../../lib/config";
import { indiceForBuild, nomeExibido, paginaOperadora } from "../../lib/operadoras";

export const GET: APIRoute = async () => {
  const indice = await indiceForBuild(DADOS_URL);
  const itens = indice.map((o) => {
    const n = nomeExibido(o);
    return {
      r: o.registro,
      n,
      ...(n !== o.nome ? { o: o.nome } : {}),
      ...(o.municipio ? { m: o.municipio } : {}),
      ...(o.uf ? { u: o.uf } : {}),
      ...(o.situacao === "cancelada" ? { c: 1 } : {}),
      h: paginaOperadora(o),
    };
  });
  return new Response(`${JSON.stringify(itens)}\n`, { headers: { "Content-Type": "application/json" } });
};
