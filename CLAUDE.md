# portal-saude

A static Astro site for the general public (provisional address `https://saude.abelhaninja.de`; the final
name and domain come later): plain answers built from Brazilian open data. v1 answers "meu plano de saúde"
with one page per health plan operator, read at build time from the `ans-feeds` data. `README.md` explains
the sources and the rebuild schedule; a git-ignored `NOTES.local.md` holds pending items when present.

## Facts to keep straight

- Data comes from `https://ans.feeds.abelhaninja.de/dados/` (repo `vasfvitor/ans-feeds`): `operadoras.json`
  (index) and `operadora/<registro>.json`, with the contract in `dados/schema.md`. A key change there needs a
  follow-up in `src/lib/operadoras.ts` and `test/fixtures/`.
- Facts compared with peers, with their base and source; never a score, grade or risk label of our own. The
  wording rules live in `src/lib/frases.ts` and are tested.
- Left out on purpose, and explained on `/sobre/`: the prudential class S1-S4 (a size segment for capital
  rules, not a financial health grade), contact data from the registry, series the ANS stopped updating.
- The only client JavaScript is the operator search (`src/components/Busca.astro`); every page works
  without it (`/plano/todas/` lists all operators). JSON-LD `<script>` tags are fine.
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
