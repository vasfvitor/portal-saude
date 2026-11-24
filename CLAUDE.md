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
- `cmed/dados/substancias.json` has the official name (DCB) of the substâncias with every part in the list, and
  is optional: without it the pages leave the line out. It is under Anvisa's CC BY-NC-SA 4.0, not open data, so
  wherever a name appears, the list and the license go with it. A substância with only some parts in the list
  shows nothing: being absent says nothing about the medicine.
- The bundles may carry `schema_version` (the producers' contract version, as in the anvisa-api manifest).
  `versao()` in `src/lib/validar.ts` reads it: absent or 1 passes, any other value fails the build. A new
  version upstream means reading the contract change first, then raising `VERSAO_CONTRATO`.
- The build never reads the per-entity files (`operadora/<r>.json`, `produto/<r>.json`): thousands of requests
  in one build made GitHub Pages answer 429. Each bundle is checked against its index, field by field.
- "Acompanhar": `feed` (operator) and `feed_substancia` (product) come from the bundles and are optional; without
  them the box and the `<link rel="alternate">` are left out. The substância feed URL is read, never built: its
  slug differs from ours. `/plano/<registro>/` (`src/pages/plano/[atalho].astro`) must keep working: every entry
  of the ans-feeds operator feeds links there, and `check:dist` checks one exists per operator.
- `src/lib/icms.ts` is the only hand-curated table: the default ICMS rate of each state for medicines, each
  row with a primary source and the day it was checked. Any change needs a source; the user reviews it.
  Review it every 6 months from the last `conferido_em` (2026-10-23, so by 2027-04), or as soon as a CMED
  list brings a rate column the table does not use (`colunas()` in `icms.ts`). Start with the states still
  `confirmado: false` (PI, RN, RR); state laws change rates, as AL did to 20.5% in April 2026.
- Facts compared with peers, with their base and source; never a score, grade or risk label of our own. The
  wording rules live in `src/lib/frases.ts` and are tested.
- Left out on purpose, and explained on `/sobre/`: the prudential class S1-S4 (a size segment for capital
  rules, not a financial health grade), contact data from the registry, series the ANS stopped updating.
- The only client JavaScript is the search box (`src/components/Busca.astro`) on `/plano/` and `/remedios/`
  and the "seu estado" picker (`src/components/SeuEstado.astro`) on the product and substância pages; every
  page works without them (`/plano/todas/`, `/remedios/substancias/`, every rate listed). The picker keeps the
  choice in `localStorage`, wrapped in try/catch. `pnpm check:dist` enforces this. JSON-LD `<script>` tags are
  fine.
- Colours have one job each, defined once in `src/layouts/Base.astro` for both themes: `--accent` is the brand and
  what you can act on, `--good` a good result or good news, `--neutral` a result in line with the typical one,
  `--alert` a bad result or something that went wrong, `--warn` worth checking but not bad (no sales, a rate to
  confirm), `--line` no comparison. No colour values outside those tokens (the logo SVG aside), and meaning is
  always in the words too, never in colour alone.
- Copy is short and plain, for people who do not know the jargon: "reclamações", not IGR; every situation
  ends in what the person can do. Write like a person explaining to a neighbour, not like an ad or an
  assistant. The shared rules are in "Public text and data on a page" below; this site adds:
  - Stock phrases seen here: "sem cadastro, sem anúncio", "tão em dia quanto". A link says where it goes
    ("Como pedir a troca").
  - Words to swap: beneficiários → clientes (unless quoting the ANS); mediana → "operadora típica", explained
    once as the one in the middle (half above, half below); apresentação → dose e embalagem; alíquota → ICMS
    do estado; trimestre codes (3T2026) → "de julho a setembro de 2026". The ANS cancellation reasons go
    through `motivoCancelamento()` in `src/lib/frases.ts`.
  - No analogy like "como uma nota de escola". Numbers keep the scale their source publishes (the ANS score
    stays 0 to 1).
  - Before a release, grep `dist/` for the phrases here and in the shared rules.
- Public text is pt-BR; code, comments, README, workflow and commit subjects are English.
- The domain is `public/CNAME` plus the repository's Pages settings; those and the DNS record are the
  user's. `anvisa-hub` (`anvisa.abelhaninja.de`) stays the technical showcase of the ANVISA projects.

## Public text and data on a page

This section is the same in the five health site repos (anvisa-hub, anvisa-dash, portal-saude,
anvisa-feeds, ans): a change to it goes to all five in the same round. Rules only one site needs stay
outside it. Each rule below comes from a defect found on these sites in the 2026-11-24 audit.

Data:

- Every number, date, count and name of a source comes from the data at build time. A fact that cannot
  (a phone line's hours, a legal deadline) lives in one config entry with its source link and the date it
  was checked, and the page shows both. A sentence like "nenhum número é digitado à mão" stays only
  while it holds.
- Name the source where the value is shown: the publisher and the specific file, table or page, linked.
  "Dados da ANVISA" alone is not a source. A table we derive names the publisher's files it comes from,
  never only our own script. Every page that shows, compares or ranks data has its sources, not only the
  main pages.
- A value carries the date of its copy next to it, not only in a folded section: the source's own date
  (Last-Modified, publication or list date, said as such) and our collection date where they differ.
  "Atualizado em" or "dados de" alone is ambiguous: say whose date it is. A list's file date is not the
  publisher's list date unless the data says so.
- Freshness is read from the data, never promised. No fixed sentence about cadence ("o site é refeito
  todo dia", "mostra a nova em até um dia", "nos dias úteis por volta das 12h30", "republicados
  diariamente"): say the date of the copy shown. Static output never says "hoje", "agora", "atual" or
  "vigente"; it says the date.
- A source that failed or lags is named, with the date of the copy shown and the first day it failed,
  on the pages that use it and not on the others. A producer that records failures keeps the first
  failure day across runs (it is part of the contract). When the publisher is known to be ahead of the
  copy we read (a newer list on its own page), the page says so.
- A comparison says what it compares: "coleta de 23/11 contra a de 20/11", "lista de 09/10 contra a de
  09/09". A diff that spans a missed day says so.
- Missing is said in words ("a ANS não informou o valor de março de 2026"). Null is never shown as 0,
  "nada", an empty cell, a zero-height bar or a dropped row; null, 0 and "does not apply" are separate
  branches. An unknown or new category value never falls into the reassuring branch (a value other than
  "Sim" or "Não" is "não informado", not "sem glúten"), and a company's declaration is labelled as one.
- A value the site computes (a count, rate, ranking, threshold, classification, "típica") says how, once,
  next to it or behind one link. The rule is on the page, not only in a code comment. Our own
  transformations are said: the data is "como a ANVISA publica, convertida para Parquet; entradas e
  saídas calculadas aqui", never just "sem alteração".
- A known caveat of a field is stated where the field appears (a footnote marker is explained on the
  same screen) and in the dictionary when there is one.
- The raw data (our JSON or Parquet and the publisher's file) and the data's licence are one link away
  from every page that shows it. The code licence (MIT) is never given as the data's licence, in JSON-LD
  either.
- A failure to load data in the browser is said ("não foi possível carregar as medidas"), never left
  looking like "nenhuma medida".

Writing (public text is pt-BR, for people who do not know the jargon):

- Say what the data shows and stop. No filler intro ("Aqui você encontra", "Nesta página"), no heading
  repeated by the sentence under it, no closing summary, no definition given twice on a page.
- No stock phrases or slogans: "saiba mais", "clique aqui", "tudo o que você precisa", "simples assim",
  "só fatos", "na dúvida, confira", "de forma rápida e fácil", "respostas diretas", any "sem X, sem Y"
  pair, any run of three adjectives. A link says where it goes; never "fonte" or "aqui" alone.
- No praise of the site: "transparente", "completo", "confiável", "com a fonte de cada número". A
  property of the site is said once, on its about page, and only while every page meets it. A disclaimer
  ("não substitui a consulta oficial", "sem vínculo com a ANVISA") appears once per page, in the footer,
  with the official link.
- A general claim needs the data behind it: "todos", "sempre", "nunca", "costumam", "muitas", "com
  frequência" only when the build counts it. Absence from our copy is "não está na lista da ANVISA de
  {data}", never "não está liberado no Brasil".
- Explain a term once, plainly, as to an adult: abbreviations spelled out the first time (preço fábrica
  (PF)), no English where Portuguese exists ("coletas", not "snapshots"), no analogies or wordplay, no
  reassurance or advice not asked for, no vague hedge in place of a known fact ("às vezes demora" when
  the collection has failed since a date). No emojis.

## Workflow

Commit when a unit of work is complete, one subject per commit, no attribution trailers. Commits are
SSH-signed, so `git commit` runs outside the sandbox: keep it as the only command on its line. Run
`git status --short` first and `git add` any new file the change needs. Pushing, Pages settings and
repository secrets are the user's.

`RUNBOOK.md` (Portuguese, for the user, not for an agent) explains every way a workflow here turns red.
Adding or changing an alarm (`::error::`, `::warning::`, a `console.warn` in `check:dist`, an `exit 1` or a
throw that ends the build) or an error message means updating its entry in the same commit, quoting the
message exactly as the log prints it.
