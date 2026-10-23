// What this deploy was built from: the scheduled workflow compares it with ans-feeds' meta.json and only
// rebuilds when the data moved.
import type { APIRoute } from "astro";
import { META_URL } from "../lib/config";
import { metaForBuild } from "../lib/operadoras";

export const GET: APIRoute = async () => {
  const { date } = await metaForBuild(META_URL);
  return new Response(`${JSON.stringify({ dados_date: date })}\n`, {
    headers: { "Content-Type": "application/json" },
  });
};
