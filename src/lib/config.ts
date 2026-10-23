// Every address the site links to or reads from, in one place.
// local data build: PUBLIC_DADOS_URL=http://localhost:8000 pnpm build (README, "Development")
export const DADOS_URL: string = (import.meta.env.PUBLIC_DADOS_URL || "https://ans.feeds.abelhaninja.de/dados").replace(
  /\/$/,
  "",
);
// ans-feeds publishes meta.json next to dados/; its `date` is the day of the data
export const META_URL = new URL("../meta.json", `${DADOS_URL}/`).href;

export const ANS_FEEDS_URL = "https://ans.feeds.abelhaninja.de/";
export const ANVISA_HUB_URL = "https://anvisa.abelhaninja.de/";
export const CONTEM_URL = "https://contem.abelhaninja.de/";
export const CMED_URL = "https://anvisa.feeds.abelhaninja.de/cmed/";
export const HOME_URL = "https://abelhaninja.de/";

export const ANS_URL = "https://www.gov.br/ans/pt-br";
export const ANS_PORTABILIDADE_URL =
  "https://www.gov.br/ans/pt-br/assuntos/contratacao-e-troca-de-plano/operadoras-em-fase-de-portabilidade-especial-e-portabilidade-extraordinaria";

export const REPOS = {
  portal: "https://github.com/vasfvitor/portal-saude",
  ansFeeds: "https://github.com/vasfvitor/ans-feeds",
} as const;
