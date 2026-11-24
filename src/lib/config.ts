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
// The CMED price list where its publisher puts it, and the ANVISA open-data file anvisa-feeds reads it from: the
// list's `stamp` is that file's date, which can be behind the newest list on the CMED page.
export const CMED_PRECOS_URL = "https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/cmed/precos";
export const CMED_ARQUIVO_URL = "https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv";

export const ANS_URL = "https://www.gov.br/ans/pt-br";
export const ANVISA_URL = "https://www.gov.br/anvisa/pt-br";
export const DCB_URL = "https://www.gov.br/anvisa/pt-br/assuntos/farmacopeia/dcb";
// The ANS consumer channels, checked on 2026-10-26 at the page below: Disque ANS on weekdays 8h-20h, free from
// any phone, and the line for deaf people. Recheck when the page moves.
export const ANS_CANAIS_URL = "https://www.gov.br/ans/pt-br/canais_atendimento/canais-de-atendimento-ao-consumidor-1";
export const DISQUE_ANS = "0800 701 9656";
export const DISQUE_ANS_SURDOS = "0800 021 2105";
export const ANS_PORTABILIDADE_URL =
  "https://www.gov.br/ans/pt-br/assuntos/contratacao-e-troca-de-plano/operadoras-em-fase-de-portabilidade-especial-e-portabilidade-extraordinaria";

// public repositories only
export const REPOS = {
  portal: "https://github.com/vasfvitor/portal-saude",
  ansFeeds: "https://github.com/vasfvitor/ans-feeds",
  anvisaFeeds: "https://github.com/vasfvitor/anvisa-feeds",
} as const;
