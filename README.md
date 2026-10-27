# portal-saude

Plain answers from Brazilian open data, for the general public. The first section answers "meu plano de
saúde": one page per health plan operator, with complaints compared with operators of the same size, the
ANS quality score (IDSS), SUS reimbursement and events such as cancellation and special portability. The
second section answers "quanto a farmácia pode cobrar": the CMED maximum consumer price of each medicine sold
in pharmacies, per presentation and per ICMS rate, with the states that use each rate.

Provisional address: <https://saude.abelhaninja.de>. The name and domain are not final.

## What the pages say, and what they do not

Facts compared with peers, each with its base and source: "recebe 2,2 vezes as reclamações de um plano
típico de porte grande", then the counts and the median behind it. The site never gives a score, a grade or
a risk label of its own. The wording rules are in `src/lib/frases.ts` and its tests.

## Where the numbers come from

Nothing is typed by hand. At build time the site reads the operator data that
[`ans-feeds`](https://github.com/vasfvitor/ans-feeds) publishes from the ANS open data:

| Source                                                         | Used for                            |
| -------------------------------------------------------------- | ----------------------------------- |
| `https://ans.feeds.abelhaninja.de/dados/operadoras.json`       | search index, A-Z list              |
| `https://ans.feeds.abelhaninja.de/dados/operadora/<r>.json`    | one page per operator (about 1,340) |
| `https://ans.feeds.abelhaninja.de/meta.json`                   | the date of the data                |
| `https://anvisa.feeds.abelhaninja.de/cmed/dados/produtos.json` | medicine index (about 7,600)        |
| `https://anvisa.feeds.abelhaninja.de/cmed/dados/todos.json`    | every medicine, one page each       |

The contract is `dados/schema.md` on the same site. Every source is required: a failed fetch or a record that
does not validate fails the build, and the previous deploy stays live.

`/build.json` records the data date the deploy was built from; `/llms.txt` describes the site for assistants.

## Rebuild schedule

`.github/workflows/pages.yml` runs on push, on manual dispatch and on three crons (11:15, 15:15 and 21:15
UTC). On a cron it compares the `date` of ans-feeds' `meta.json` with `/build.json` and only rebuilds when
the data moved. The custom domain comes from `public/CNAME` plus the repository's Pages settings.

## Client JavaScript

Only the operator search on `/plano/` (`src/components/Busca.astro`); every page works without it, and
`/plano/todas/` lists all operators. `pnpm check:dist` fails the build if any other script shows up.

## Development

```sh
pnpm install
pnpm dev
pnpm format:check && pnpm lint && pnpm test && pnpm check && pnpm build && pnpm check:dist
```

Offline, against the fixtures (three real operators):

```sh
python3 -m http.server -d test/fixtures 8000 &
PUBLIC_DADOS_URL=http://localhost:8000/dados pnpm build
```

`pnpm og` renders `public/og.png`; rerun it when the wording changes and commit the PNG.
