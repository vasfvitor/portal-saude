// The site in plain text for assistants and agents: what it answers, the pages, where the data comes from.
import type { APIRoute } from "astro";
import { DESCRIPTION, NAME, TITLE } from "../lib/brand";
import { CMED_DADOS_URL, DADOS_URL, META_URL, REPOS } from "../lib/config";
import { fmtDate, fmtInt } from "../lib/format";
import { indiceForBuild, metaForBuild } from "../lib/operadoras";

export const GET: APIRoute = async ({ site }) => {
  const [indice, meta] = await Promise.all([indiceForBuild(DADOS_URL), metaForBuild(META_URL)]);
  const url = (p: string) => new URL(p, site).href;
  const ativas = indice.filter((o) => o.situacao === "ativa").length;
  const body = `# ${NAME}

> ${TITLE}. ${DESCRIPTION}

Dados de ${fmtDate(meta.date)}: ${fmtInt(ativas)} operadoras de planos de saúde ativas na ANS e ${fmtInt(indice.length - ativas)} ${indice.length - ativas === 1 ? "cancelada" : "canceladas"} nos últimos 5 anos.

## Páginas

- [Plano de saúde](${url("/plano/")}): busca da operadora, portabilidades em vigor, cancelamentos recentes.
- [Página de cada operadora](${url("/plano/todas/")}): /plano/<registro ANS>-<nome>/, com reclamações comparadas com operadoras do mesmo porte (também como "1 reclamação para cada N clientes" no trimestre), nota de desempenho da ANS (IDSS, de 0 a 1), ressarcimento ao SUS e histórico.
- [Portabilidade especial](${url("/plano/portabilidade/")}): o que é, como pedir, quais operadoras.
- [Remédios](${url("/remedios/")}): preço máximo que a farmácia pode cobrar por remédio, por apresentação e por ICMS do estado (lista da CMED); página por produto e por substância.
- [Sobre](${url("/sobre/")}): método, fontes e o que fica de fora.

## Regras do conteúdo

- Só fatos comparados, com a base e a fonte; o site não dá nota nem rótulo de risco.
- "Operadora típica" é a mediana das operadoras do mesmo porte (reclamações) ou da mesma modalidade (IDSS).
- Sem vínculo com a ANS nem com a ANVISA.

## Dados

- JSON por operadora: ${DADOS_URL}/operadora/<registro>.json (contrato em ${DADOS_URL}/schema.md)
- Preço máximo por remédio: ${CMED_DADOS_URL}/produto/<registro>.json (contrato em ${CMED_DADOS_URL}/schema.md)
- Código dos dados das operadoras: ${REPOS.ansFeeds}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
