# CLAUDE.md — Cidade Contábil

Jogo mobile (tela em **retrato**) para aprender Contabilidade em uma cidade viva.
Público: **concurseiros** (principal) e estudantes de Ciências Contábeis.
O jogador administra uma empresa, faz operações e responde afirmativas Certo/Errado
no estilo de banca. A contabilidade é a própria mecânica do jogo.

## Leia antes de qualquer tarefa

1. `docs/roadmap.md` — marcos e critérios de aceite. Trabalhe um marco por vez.
2. `docs/regras-contabeis.md` — **fonte da verdade contábil e tributária.**
3. `docs/arquitetura.md` — camadas e fluxo de dados.
4. `docs/gdd.md`, `docs/campanha.md` e `docs/fluxo-afirmativas.md` — design do jogo.
5. `docs/adr/` — decisões já tomadas. Não as reverta sem pedir.

## Regras inegociáveis

### Contabilidade
- **Nunca invente regra contábil ou tributária.** Se um caso não está em
  `docs/regras-contabeis.md`, pare e pergunte. Não "complete" com o que parecer razoável.
- Toda regra implementada referencia o ID da regra (ex.: `// R-ICMS-02`) e tem teste.
- Os cenários `docs/cenario-campanha.md` (principal) e `docs/cenario-referencia.md`
  (tributos e custo médio) são os **testes dourados**: precisam passar centavo por
  centavo, sempre.
- Regras marcadas com 📘 são simplificações didáticas: implemente como descrito e
  exponha a "nota didática" na UI.
- Invariantes checados em todo teste do ledger:
  - débitos = créditos em cada lançamento;
  - Ativo = Passivo + PL após cada operação (com resultado apurado);
  - nenhum saldo de estoque com quantidade negativa.

### Arquitetura
- `packages/ledger` é **TypeScript puro**: sem Phaser, React, DOM ou I/O.
  Funções determinísticas; o tempo de jogo entra como parâmetro.
- **O razão só recebe lançamentos gerados pelo motor.** O lançamento montado pelo
  jogador é *comparado* com o esperado e nunca é gravado direto (ADR-0005).
- Dinheiro em **centavos inteiros** (`number` inteiro). Nunca use float para valor.
  Arredondamento: meio para cima, em centavos, por linha de tributo (ADR-0006).
- Missões e afirmativas são **dados** (`packages/content/data`), validados por schema
  zod. Missão declara a *operação*; o lançamento esperado é calculado pelo motor.
- Separação de entidade: a carteira pessoal do avatar **não** faz parte do razão da
  empresa (ADR-0004).
- Phaser cuida só do mapa/mundo; React cuida de HUD e painéis. Comunicação por um
  event bus tipado; Phaser não importa componentes React e vice-versa.

### Código
- Domínio em português, sem acento nos identificadores (`Lancamento`, `Conta`,
  `custoMedio`). Termos técnicos genéricos podem ficar em inglês (`store`, `bus`).
- Textos de interface em pt-BR, com terminologia da Lei 6.404/76 e dos CPCs.
- TypeScript `strict`. Sem `any` no ledger.
- Toda mudança no ledger vem com teste (Vitest). Rode testes e typecheck antes de concluir.
- Commits pequenos, um assunto por commit, mensagem em português.

## Layout do repositório

```
apps/game          app (Vite + React + Phaser), empacotado com Capacitor
packages/ledger    motor de partidas dobradas, estoque e tributos
packages/content   schemas + dados de missões e afirmativas
docs/              GDD, regras, arquitetura, roadmap, ADRs, referências
```

## Comandos

Requer Node ≥ 22.12 (`.nvmrc`) e pnpm via Corepack (`corepack enable`). Rode na raiz:

| Comando | O que faz |
|---|---|
| `pnpm install` | instala as dependências do monorepo |
| `pnpm dev` | sobe o app (`apps/game`) no Vite, em http://localhost:5173 |
| `pnpm test` | Vitest em todos os pacotes |
| `pnpm typecheck` | `tsc --noEmit` em todos os pacotes |
| `pnpm lint` | Biome: lint + verificação de formatação (ADR-0009) |
| `pnpm format` | Biome: aplica formatação e correções seguras |
| `pnpm build` | build de produção do app em `apps/game/dist` |

Em um pacote só: `pnpm --filter @cidade/ledger test` (ou `@cidade/content`, `@cidade/game`).
Modo watch: `pnpm --filter @cidade/ledger exec vitest`.

As versões das dependências ficam no `catalog` de `pnpm-workspace.yaml`. O CI
(`.github/workflows/ci.yml`) roda lint, typecheck, test e build.

## Quando estiver em dúvida

- Dúvida contábil/tributária → pergunte, citando a regra mais próxima.
- Dúvida de design de jogo → siga o GDD; se não estiver lá, proponha e pergunte.
- Os mockups em `docs/referencias/` são **referência visual**, não especificação.
