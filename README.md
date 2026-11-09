# Performance Tracking (Digital Reports)

App de relatório de lote do NETZSCH Digital Reports. Três versões da interface convivem
no mesmo repositório — **este README é o mapa de qual código é de qual versão.**

## As versões

| | O que é | Código | Rota |
|---|---|---|---|
| **v0** | Edição **restrita**. Não é código separado — é o v1 com `?v=0`: só a tela Registry e, dentro do lote, só a aba Resume. | `src/v1/` (mesmo do v1) | `/batch-book?v=0` |
| **v1** | App **Tailwind** completo. | `src/v1/` | `/batch-book` |
| **v2** | Rebuild em **Material UI + ECharts**, paralelo ao v1 (o v1 ficou intacto). | `src/v2/` | `/batch-book-v2` |
| **v2 live** | O mesmo v2, ligado na **API real** (Notify / IRIS Cloud) em vez do dataset sintético. | `src/v2/live/` | `/` → `/iris-app` e `/iris-*` |

**O que o v0 esconde está definido num lugar só: [`src/shared/versionGate.ts`](src/shared/versionGate.ts).**
v1 e v2 leem esse módulo — mudou a regra do v0, muda lá e as duas versões seguem juntas.
Não espalhe `restricted && key !== 'registry'` pelo código de novo.

## Estrutura

```
src/
  shared/     ← usado por MAIS DE UMA versão. ⚠ mexer aqui afeta v1 e v2.
    api/        cliente tipado da API real (Notify/IRIS): Bearer, refresh 401/403, adapters
    client/     Session, CompanyState, tema MUI, chrome IRIS
    config/     runtimeConfig (URLs e chaves lidas em runtime)
    data/       dataset sintético determinístico + schemas de formulário
    lib/        cálculo puro (KPIs, OEE, availability), hooks, export XLSX/PDF
    server/     auth por cookie + Drizzle/Neon (só server-side, usado pelas rotas)
    stories/    fixtures do Storybook
    viz/        primitivas de gráfico que as DUAS versões desenham
    versionGate.ts   ← as regras de v0/v1/v2

  v1/         ← app Tailwind (serve v0 e v1). Nada aqui é importado pelo v2.
    App.tsx     entry point
    components/ screens/ icons/ stories/

  v2/         ← rebuild Material UI + ECharts. Nada aqui é importado pelo v1.
    AppV2.tsx   entry point (dataset sintético)
    screens/ components/
    live/       o mesmo v2 alimentado por dado real da API
```

As três camadas não se cruzam: `v1` e `v2` nunca importam um do outro, e `shared` nunca
importa de `v1`/`v2`. Se você precisar de algo do v1 dentro do v2, **promova pra `shared/`** —
não crie o atalho.

Arquivos que hoje não estão ligados em nenhuma rota levam um aviso `⚠ NOT WIRED` no topo.

## Stack

- Next.js 15 (App Router) + React 18 + TypeScript
- **v1:** Tailwind CSS v4 (tokens do DS no `@theme` de `app/globals.css`), gráficos custom em SVG
- **v2:** Material UI 9 (tema IRIS em `src/shared/client/mui/theme.ts`) + ECharts 6
- Neon/Postgres via Drizzle (auth legada por cookie); a auth do IRIS é client-side por token
- Fonte Roboto

## Rodar

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run test         # vitest (OEE, adapters, expected results)
npm run build        # build de produção
npm run storybook    # componentes do v1
```

## Dados

Por padrão o app roda com dataset **sintético e determinístico** (PRNG seedado) em
`src/shared/data/mockData.ts` — 3 meses de lotes por máquina/receita/status;
`src/shared/lib/compute.ts` concentra as agregações.

O caminho de dado **real** é o `src/v2/live/loadLiveApp.ts`, que busca na API e injeta nos
mesmos datasets — por isso as telas do v2 renderizam igual com mock ou com produção.
Campos sem contrapartida no backend ficam no default neutro e as telas mostram `—`,
nunca um número inventado. Detalhes da integração: [`INTEGRATION_NOTES.md`](INTEGRATION_NOTES.md).

## Deploy

PROD em **batchbook.ntechcolab.com** (Vercel, projeto `digitalproducts-batchbook`, conta
ntechcolab). Deploy pela CLI (`vercel --prod`) — não há auto-deploy do GitHub conectado.
Commits neste repo vão como **ntechcolab-prog**; há um hook `pre-push` que bloqueia outro autor.
