// Every address the site links to or reads from, in one place.
// local data build: PUBLIC_DADOS_URL=http://localhost:8000 pnpm build (README, "Development")
export const DADOS_URL: string = (import.meta.env.PUBLIC_DADOS_URL || "https://ans.feeds.abelhaninja.de/dados").replace(
  /\/$/,
  "",
);
// CMED prices per product, from anvisa-feeds; local build: PUBLIC_CMED_DADOS_URL=http://localhost:8000/cmed/dados
export const CMED_DADOS_URL: string = (
  import.meta.env.PUBLIC_CMED_DADOS_URL || "https://anvisa.feeds.abelhaninja.de/cmed/dados"
).replace(/\/$/, "");
// ans-feeds publishes meta.json next to dados/; its `date` is the day of the data
export const META_URL = new URL("../meta.json", `${DADOS_URL}/`).href;

export const ANS_FEEDS_URL = "https://ans.feeds.abelhaninja.de/";
export const ANVISA_HUB_URL = "https://anvisa.abelhaninja.de/";
export const CONTEM_URL = "https://contem.abelhaninja.de/";
export const CMED_URL = "https://anvisa.feeds.abelhaninja.de/cmed/";

export const ANS_URL = "https://www.gov.br/ans/pt-br";
export const ANVISA_URL = "https://www.gov.br/anvisa/pt-br";
export const ANS_PORTABILIDADE_URL =
  "https://www.gov.br/ans/pt-br/assuntos/contratacao-e-troca-de-plano/operadoras-em-fase-de-portabilidade-especial-e-portabilidade-extraordinaria";

// public repositories only: the portal repository is private, so it is not linked
export const REPOS = {
  ansFeeds: "https://github.com/vasfvitor/ans-feeds",
} as const;
