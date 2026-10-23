# portal-saude

Plain answers from Brazilian open data, for the general public. The first section answers "meu plano de
saúde": one page per health plan operator, with complaints compared with operators of the same size, the
ANS quality score, SUS reimbursement and events such as special portability, read at build time from
[`ans-feeds`](https://github.com/vasfvitor/ans-feeds).

Provisional address: <https://saude.abelhaninja.de>.

## Development

```sh
pnpm install
pnpm dev
pnpm format:check && pnpm lint && pnpm test && pnpm check && pnpm build
```
