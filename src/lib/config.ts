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
// The ANS consumer channels: the numbers, the Disque ANS hours and the deadlines the ANS gives an operator to answer
// a complaint (NIP) are facts the data does not carry, so each one says where it was read and when; the operator
// page shows both. All from the page below, checked on 2026-11-25. Recheck when the page moves.
export const ANS_CANAIS_URL = "https://www.gov.br/ans/pt-br/canais_atendimento/canais-de-atendimento-ao-consumidor-1";
export const DISQUE_ANS = "0800 701 9656";
export const DISQUE_ANS_SURDOS = "0800 021 2105";
/** "Funcionamento do Disque ANS: segunda a sexta-feira (exceto feriados nacionais), das 8 às 20 horas." */
export const DISQUE_ANS_HORARIO = {
  texto: "de segunda a sexta, exceto feriados nacionais, das 8h às 20h",
  fonte: ANS_CANAIS_URL,
  conferido_em: "2026-11-25",
};
/** "5 dias úteis para reclamações relacionadas à cobertura do plano de saúde [...]; 10 dias úteis para outros tipos
 * de reclamações" */
export const PRAZO_RESPOSTA_ANS = {
  cobertura: 5,
  outros: 10,
  fonte: ANS_CANAIS_URL,
  conferido_em: "2026-11-25",
};
export const ANS_PORTABILIDADE_URL =
  "https://www.gov.br/ans/pt-br/assuntos/contratacao-e-troca-de-plano/operadoras-em-fase-de-portabilidade-especial-e-portabilidade-extraordinaria";

// where a reader reports a wrong number or text: the e-mail half of "Encontrou um erro?" (src/lib/relato.ts); the
// GitHub half opens an issue in REPOS.portal. scripts/check-dist.mjs reads this line to allow this one address.
export const RELATO_EMAIL = "ajuda@abelhaninja.de";

// public repositories only
export const REPOS = {
  portal: "https://github.com/vasfvitor/portal-saude",
  ansFeeds: "https://github.com/vasfvitor/ans-feeds",
  anvisaFeeds: "https://github.com/vasfvitor/anvisa-feeds",
} as const;
