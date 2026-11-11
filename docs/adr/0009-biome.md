# ADR-0009 — Biome como linter e formatter

**Status:** aceito

## Contexto
O M0 pede um linter/formatter, escolhendo entre Biome e ESLint + Prettier. O projeto é
um monorepo TypeScript pequeno, sem regras de lint específicas de framework que já
sejam exigidas, e o CI precisa ser rápido e simples.

## Decisão
- **Biome** faz lint e formatação de TypeScript, TSX, JSON e CSS, com uma única
  configuração na raiz (`biome.json`).
- Regras recomendadas, com `noExplicitAny` como erro (reforça "sem `any` no ledger").
- Formatação: 2 espaços, LF, 100 colunas (alinhada ao `.editorconfig`).
- `pnpm lint` verifica (usado no CI); `pnpm format` aplica as correções.
- Markdown e `docs/` ficam **fora** do Biome: os documentos são a fonte da verdade
  contábil e não devem ser reformatados por ferramenta.

## Consequências
- Uma dependência e um arquivo de configuração, em vez de ESLint + Prettier + plugins.
- Os dados em `packages/content/data` (JSON) seguem a formatação do Biome.
- O Biome não tem todas as regras do ecossistema ESLint (ex.: `react-hooks` completo).
  Se uma regra indispensável faltar, um novo ADR reavalia a escolha.
