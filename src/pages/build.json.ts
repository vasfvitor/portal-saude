// What this deploy was built from: the scheduled workflow compares it with the live sources (ans-feeds'
// meta.json date and the CMED list stamp) and only rebuilds when one of them moved.
import type { APIRoute } from "astro";
import { CMED_DADOS_URL, META_URL } from "../lib/config";
import { metaForBuild } from "../lib/operadoras";
import { indiceProdutosForBuild } from "../lib/remedios";

export const GET: APIRoute = async () => {
  const [{ date }, { stamp }] = await Promise.all([metaForBuild(META_URL), indiceProdutosForBuild(CMED_DADOS_URL)]);
  return new Response(`${JSON.stringify({ dados_date: date, cmed_stamp: stamp })}\n`, {
    headers: { "Content-Type": "application/json" },
  });
};
