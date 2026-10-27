# portal-saude

A static Astro site for the general public (provisional address `https://saude.abelhaninja.de`; the final
name and domain come later): plain answers built from Brazilian open data. Two sections: "meu plano de
saúde" (one page per health plan operator, from the `ans-feeds` data) and "remédios" (the CMED maximum
consumer price of each product, from the `anvisa-feeds` `cmed/dados/`). `README.md` explains
the sources and the rebuild schedule; a git-ignored `NOTES.local.md` holds pending items when present.

## Facts to keep straight

- Data comes from `https://ans.feeds.abelhaninja.de/dados/` (repo `vasfvitor/ans-feeds`): `operadoras.json`
  (index) and `todas.json` (every operator in one file), with the contract in `dados/schema.md`. A key change
  there needs a follow-up in `src/lib/operadoras.ts` and `test/fixtures/`.
- CMED prices come from `https://anvisa.feeds.abelhaninja.de/cmed/dados/` (contract in its `schema.md`): the
  build reads `produtos.json` and `todos.json` (every product in one file). A key change there needs a
  follow-up in `src/lib/remedios.ts` and `test/fixtures/cmed/`. Every price is shown with its ICMS rate; the
  page never states one price for a state on its own.
- The build never reads the per-entity files (`operadora/<r>.json`, `produto/<r>.json`): thousands of requests
  in one build made GitHub Pages answer 429. Each bundle is checked against its index, field by field.
- `src/lib/icms.ts` is the only hand-curated table: the default ICMS rate of each state for medicines, each
  row with a primary source and the day it was checked. Any change needs a source; the user reviews it.
- Facts compared with peers, with their base and source; never a score, grade or risk label of our own. The
  wording rules live in `src/lib/frases.ts` and are tested.
- Left out on purpose, and explained on `/sobre/`: the prudential class S1-S4 (a size segment for capital
  rules, not a financial health grade), contact data from the registry, series the ANS stopped updating.
- The only client JavaScript is the search box (`src/components/Busca.astro`) on `/plano/` and `/remedios/`;
  every page works without it (`/plano/todas/`, `/remedios/substancias/`). JSON-LD `<script>` tags are fine.
- Numbers are never hand-typed. If a value is missing in the data, the page says so.
- Copy is short and plain, for people who do not know the jargon: "reclamações", not IGR; every situation
  ends in what the person can do.
- Public text is pt-BR; code, comments, README, workflow and commit subjects are English.
- The domain is `public/CNAME` plus the repository's Pages settings; those and the DNS record are the
  user's. `anvisa-hub` (`anvisa.abelhaninja.de`) stays the technical showcase of the ANVISA projects.

## Workflow

Commit when a unit of work is complete, one subject per commit, no attribution trailers. Commits are
SSH-signed, so `git commit` runs outside the sandbox: keep it as the only command on its line. Run
`git status --short` first and `git add` any new file the change needs. Pushing, Pages settings and
repository secrets are the user's.
