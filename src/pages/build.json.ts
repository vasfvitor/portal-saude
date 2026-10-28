// What this deploy was built from: the scheduled workflow compares it with the live sources (ans-feeds'
// meta.json date, the CMED list stamp and the ANVISA registration build behind cmed/dados) and only rebuilds
// when one of them moved. situacao_build is null when the registration source was not read.
import type { APIRoute } from "astro";
import { CMED_DADOS_URL, META_URL } from "../lib/config";
import { metaForBuild } from "../lib/operadoras";
import { indiceProdutosForBuild } from "../lib/remedios";

export const GET: APIRoute = async () => {
  const [{ date }, { stamp, situacao_build }] = await Promise.all([
    metaForBuild(META_URL),
    indiceProdutosForBuild(CMED_DADOS_URL),
  ]);
  const body = { dados_date: date, cmed_stamp: stamp, situacao_build };
  return new Response(`${JSON.stringify(body)}\n`, {
    headers: { "Content-Type": "application/json" },
  });
};
