# RUNBOOK do portal-saude

O que fazer quando um workflow deste repo fica vermelho. Comece pelo
[RUNBOOK do anvisa-hub](https://github.com/vasfvitor/anvisa-hub/blob/main/RUNBOOK.md): lá estão o mapa
dos seis repos, a rotina e o que vale para todos (rodar de novo, run cinza, lockfile, Pages, keepalive).

As mensagens aparecem aqui como o log mostra, em inglês. Procure com Ctrl+F um trecho da mensagem que
você viu. `<arquivo>`, `N` e afins marcam a parte que muda.

Quem cria ou muda um alarme ou uma mensagem de erro atualiza este arquivo no mesmo commit.

## Índice

| Workflow     | Trecho da mensagem                                                                            | Entrada                                                                 |
| ------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Publish site | `could not read the` (aviso amarelo)                                                          | [Fonte não abriu no verify](#fonte-não-abriu-no-verify)                 |
| Publish site | `HTTP 404 at`, `HTTP 503 at`, `HTTP 429 at`, `TimeoutError`, `fetch failed`                   | [Fonte fora do ar ou lenta](#fonte-fora-do-ar-ou-lenta)                 |
| Publish site | `schema_version`, `(this site reads 1)`                                                       | [Contrato de uma fonte mudou](#contrato-de-uma-fonte-mudou)             |
| Publish site | `not an object`, `no <campo>`, `bad <campo>`, `without PMC`, `cancelled without cancelamento` | [Campo inválido numa fonte](#campo-inválido-numa-fonte)                 |
| Publish site | `date ..., but meta.json has`, `but ... lists`, `but ... has`                                 | [Fonte publicada pela metade](#fonte-publicada-pela-metade)             |
| Publish site | `unknown rate`                                                                                | [Alíquota de ICMS nova](#alíquota-de-icms-nova)                         |
| Publish site | `problem(s) in`, `unexpected <script`, `broken internal link`, `e-mail-like text`             | [Conferência do site gerado falhou](#conferência-do-site-gerado-falhou) |
| Publish site | `warning: built without the`                                                                  | [Site saiu sem dados da ANVISA](#site-saiu-sem-dados-da-anvisa)         |
| Publish site | `format:check`, `lint`, `test`, `check`                                                       | [Lint, formato, testes ou tipos](#lint-formato-testes-ou-tipos)         |
| (ans-feeds)  | `the portal could not be read or is more than 2 days behind`                                  | [Portal atrasado](#portal-atrasado)                                     |

## Publish site

Roda em push no `main`, à mão, e três vezes por dia (13:15, 17:45 e 21:15 UTC). Nos horários fixos, o job
`verify` compara três coisas com `/build.json` do site e só publica quando alguma mudou:

- a data dos dados do ans-feeds;
- o carimbo da lista da CMED, no anvisa-feeds;
- o build da situação dos registros, também no anvisa-feeds.

Se não conseguir ler a data do ans-feeds ou o carimbo da CMED, não publica e deixa um aviso amarelo (ver
[Fonte não abriu no verify](#fonte-não-abriu-no-verify)). Se quem não abre é o `/build.json` do próprio
site, publica.

Todas as fontes são obrigatórias. Em qualquer falha do build, **o site anterior continua no ar**.

### Fonte não abriu no verify

- **Onde aparece:** job `verify`, como aviso amarelo. O run fica verde e o build não roda.
- **Mensagem:** `::warning::could not read the date of the ans-feeds meta.json; not publishing, the site keeps its current build`.
  Ou `the CMED stamp of the anvisa-feeds meta.json`, ou os dois.
- **O que quer dizer:** num horário fixo, o `meta.json` do ans-feeds ou do anvisa-feeds não abriu, ou
  veio sem a data. Como todas as fontes são obrigatórias, o build falharia.
- **O site foi afetado?** Não. Segue com o build anterior, que fica velho enquanto isso durar.
- **Agir ou esperar:** esperar. O próximo horário tenta de novo, e o alarme do produtor diz o motivo: ver
  o RUNBOOK do [ans-feeds](https://github.com/vasfvitor/ans-feeds/blob/main/RUNBOOK.md) ou do
  [anvisa-feeds](https://github.com/vasfvitor/anvisa-feeds/blob/main/RUNBOOK.md).
- **Pedir ajuda quando:** o aviso se repetir por mais de um dia com o produtor verde.

### Fonte fora do ar ou lenta

- **Onde aparece:** passo Build.
- **Mensagens:** `HTTP 404 at <url>`, `HTTP 503 at <url>`, `HTTP 429 at <url>`,
  `TimeoutError: The operation was aborted due to timeout`, `fetch failed at <url>`.
- **O que quer dizer:** um arquivo do ans-feeds ou do anvisa-feeds não abriu durante o build. Nos
  horários fixos, o `verify` costuma parar antes, com o aviso amarelo; este vermelho aparece num push, num
  "Run workflow" ou quando a fonte cai entre o `verify` e o build. O build tenta de novo, com
  espera crescente, em erro de rede, tempo esgotado, 429 e 5xx. Um 404 falha na hora.
- **O site foi afetado?** Não. O site anterior continua.
- **Exemplo real:** de 23 a 26/10/2026, o Pages respondeu 429 porque o build pedia milhares de arquivos
  seguidos. Desde então, o build lê um arquivo só com todos os remédios (`cmed/dados/todos.json`) e tenta
  de novo quando recebe 429.
- **Agir ou esperar:** esperar. O próximo horário tenta de novo.
- **Pedir ajuda quando:** o mesmo arquivo der 404 (pode ter mudado de nome), ou o erro passar de um dia.
  Ver também o RUNBOOK do
  [ans-feeds](https://github.com/vasfvitor/ans-feeds/blob/main/RUNBOOK.md) ou do
  [anvisa-feeds](https://github.com/vasfvitor/anvisa-feeds/blob/main/RUNBOOK.md), conforme a URL.

### Contrato de uma fonte mudou

- **Onde aparece:** passo Build.
- **Mensagem:** `<arquivo>: schema_version N (this site reads 1)`. Pode vir de `meta.json`, `todas.json`,
  `produtos.json`, `todos.json` ou `substancias.json`.
- **O que quer dizer:** o ans-feeds ou o anvisa-feeds mudou o formato de um arquivo de um jeito que este
  site não sabe ler. Eles só sobem a versão quando um campo some, muda de nome ou de sentido.
- **O site foi afetado?** Não. O site anterior continua, mas não atualiza até o portal ser ajustado.
- **Agir ou esperar:** agir. Ler a mudança no contrato do produtor (`dados/schema.md` no site dele) e
  ajustar o portal. Só depois subir `VERSAO_CONTRATO` em `src/lib/validar.ts`. Pedir ajuda.

### Campo inválido numa fonte

- **Onde aparece:** passo Build.
- **Mensagens**, por exemplo:
  - `<arquivo>: not an object`, `<arquivo>: no <campo>`, `<arquivo>: bad <campo>`;
  - `operadoras.json: empty`;
  - `operadora <registro>: cancelled without cancelamento`;
  - `produto <registro>: <ggrem> without PMC`, `... bad price at <alíquota>`.
- **O que quer dizer:** um registro não passou na validação. O portal confere campo por campo e prefere
  não publicar a publicar dado errado.
- **O site foi afetado?** Não. O site anterior continua.
- **Agir ou esperar:** pedir ajuda. Ou o produtor mudou um campo sem subir a versão, ou o dado da ANS ou
  da CMED veio estranho. A correção vai em `src/lib/operadoras.ts` ou `src/lib/remedios.ts` e nas
  fixtures.

### Fonte publicada pela metade

- **Onde aparece:** passo Build.
- **Mensagens:**
  - `todas.json: date A, but meta.json has B`
  - `todas.json: N operators, but operadoras.json lists M`
  - `todos.json[i] (<registro>): apresentacoes ..., but produtos.json has ...`
- **O que quer dizer:** o build leu dois arquivos de um produtor no meio de um deploy dele: um já era o
  novo, o outro ainda o antigo.
- **O site foi afetado?** Não. O site anterior continua.
- **Agir ou esperar:** esperar. O próximo horário resolve. Se quiser, rodar de novo depois de 10 minutos.
- **Pedir ajuda quando:** repetir em todos os horários de um dia.

### Alíquota de ICMS nova

- **Onde aparece:** passo Build.
- **Mensagem:** `produto <registro> <ggrem> pmc: unknown rate <alíquota>`
- **O que quer dizer:** a lista da CMED trouxe uma coluna de preço com uma alíquota de ICMS que o portal
  não conhece. Costuma ser um estado que mudou a lei, e aparece logo depois de o anvisa-api e o
  anvisa-feeds aceitarem a alíquota nova.
- **O site foi afetado?** Não. O site anterior continua, com a lista anterior.
- **Agir ou esperar:** agir. Revisar `src/lib/icms.ts` (a tabela de alíquota padrão de cada estado, a
  única mantida à mão). Cada linha precisa de uma fonte oficial. Pedir ajuda.

### Conferência do site gerado falhou

- **Onde aparece:** passo `pnpm check:dist`.
- **Mensagens:**
  - `<página>: unexpected <script ...>`;
  - `<página>: e-mail-like text <texto>`;
  - `<página>: broken internal link <link>`;
  - `operator page missing: ...`, `medicine page missing: ...` ou `operator shortcut missing: ...`;
  - no fim, `N problem(s) in M pages`.
- **O que quer dizer:** o site gerado tem um script que não devia, um texto que parece e-mail (por
  exemplo, vindo de um dado da ANS), um link interno quebrado ou uma página de operadora faltando.
- **O site foi afetado?** Não. O site anterior continua.
- **Agir ou esperar:** pedir ajuda. A mensagem diz a página.

### Site saiu sem dados da ANVISA

- **Onde aparece:** passo `pnpm check:dist`. É só um aviso no log: o run fica verde.
- **Mensagens:**
  - `warning: built without the ANVISA registration data (cmed/dados situacao_fonte is null or absent)`
  - `warning: built without the official names (cmed/dados/substancias.json is absent or has no fonte)`
- **O que quer dizer:** o anvisa-feeds publicou os remédios sem a situação do registro ou sem os nomes
  oficiais (DCB), porque não conseguiu ler o anvisa-api.
- **O site foi afetado?** Sim, em parte. As páginas de remédio dizem "Nesta atualização do site não foi
  possível conferir na ANVISA se o registro está ativo nem se há medidas sobre este remédio." As páginas
  de substância saem sem o nome oficial.
- **O que fazer:** ver
  [anvisa-api não foi lido](https://github.com/vasfvitor/anvisa-feeds/blob/main/RUNBOOK.md#anvisa-api-não-foi-lido)
  no RUNBOOK do anvisa-feeds. Quando ele publicar com esses dados, o portal atualiza no próximo horário.

### Lint, formato, testes ou tipos

- **Onde aparece:** passos `pnpm format:check`, `pnpm lint`, `pnpm test` ou `pnpm check`.
- **O que fazer**, na máquina:

  ```bash
  pnpm install
  pnpm format        # corrige a formatação
  pnpm lint
  pnpm test
  pnpm check
  ```

- `pnpm install --frozen-lockfile` falhou: ver o RUNBOOK do hub, "Lockfile desatualizado".

## Portal atrasado

Este alarme fica vermelho no **ans-feeds**, não aqui:
`::error::the portal could not be read or is more than 2 days behind <data>`. Ele existe porque o GitHub
pode desligar o cron deste repo sem avisar.

- **O que fazer:**
  1. Abrir Actions → Publish site neste repo e ver o último run.
  2. Se estiver vermelho, achar a entrada acima pela mensagem. Se estiver verde com o aviso
     `could not read`, o portal parou porque uma fonte não abre: ver
     [Fonte não abriu no verify](#fonte-não-abriu-no-verify).
  3. Se não houver run recente, o cron pode ter sido desligado: na página do workflow, "Enable workflow",
     e depois "Run workflow".
  4. Se o run estiver verde e o alarme continuar, abrir `https://saude.abelhaninja.de/build.json` no
     navegador. Se não abrir, pode ser o certificado do Pages (ver o RUNBOOK do hub).

## Problemas conhecidos

Achados em 2026-11-03, ainda sem correção.

- **A situação do registro aparece sem a data do dado.** "Ativo, válido até ..." vem do anvisa-api, que
  desde 13/10/2026 não recebe arquivos novos da ANVISA. A página não diz de quando é essa informação.
  Fase 3.
- **Campos opcionais que somem sem aviso.** Se um produtor deixar de mandar um campo opcional (feed,
  medidas, situação, beneficiários, entre outros), o build fica verde e o bloco some da página. Fase 3.
- **Nomes oficiais novos podem esperar.** O `verify` não compara a versão da DCB. Um `substancias.json`
  novo só entra quando outra das três coisas mudar.
