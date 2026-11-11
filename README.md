# Cidade Contábil

Jogo mobile, em tela retrato, para aprender Contabilidade administrando uma empresa
numa cidade viva. Cada operação comercial gera um fato contábil. O jogador vê o
efeito no patrimônio, responde afirmativas Certo/Errado no estilo de banca e monta
os lançamentos.

**Público:** concurseiros (principal) e estudantes de Ciências Contábeis.

**Status:** marcos M0 a M4 concluídos: monorepo, motor contábil (`packages/ledger`),
conteúdo (`packages/content`), a casca do app com HUD e painéis e o mapa da cidade com
os 6 estabelecimentos. O próximo é o M5, o ciclo completo da missão.

## Documentos

| Documento | Conteúdo |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Regras de trabalho para o agente de código |
| [docs/gdd.md](docs/gdd.md) | Design do jogo (versão refinada do conceito) |
| [docs/campanha.md](docs/campanha.md) | Campanha "O Primeiro Negócio" (capítulos 1–7 no MVP) |
| [docs/regras-contabeis.md](docs/regras-contabeis.md) | Plano de contas e regras contábeis/tributárias, com IDs |
| [docs/cenario-campanha.md](docs/cenario-campanha.md) | Campanha completa com valores esperados (teste dourado principal) |
| [docs/cenario-referencia.md](docs/cenario-referencia.md) | Cenário de tributos e custo médio (teste dourado) |
| [docs/fluxo-afirmativas.md](docs/fluxo-afirmativas.md) | Como, quando e quantas afirmativas aparecem |
| [docs/modelo-de-conteudo.md](docs/modelo-de-conteudo.md) | Formato de missões e afirmativas |
| [docs/arquitetura.md](docs/arquitetura.md) | Camadas, fluxo de dados e estado |
| [docs/roadmap.md](docs/roadmap.md) | Marcos M0–M8 com critérios de aceite |
| [docs/adr/](docs/adr/) | Decisões de arquitetura e de domínio |
| [docs/referencias/](docs/referencias/) | Conceito original, história da campanha, mockups e deck Anki (referência, não especificação) |

## Estrutura

```
cidade-contabil/
├── apps/game/          # Vite + React (UI) + Phaser (mapa) + Capacitor
├── packages/ledger/    # motor contábil puro em TypeScript
├── packages/content/   # schemas zod + missões e afirmativas em JSON
└── docs/
```

## Como começar

```
corepack enable
pnpm install
pnpm dev          # abre o jogo em http://localhost:5173
pnpm test && pnpm typecheck && pnpm lint
```

Para desenvolver com o Claude Code, avance um marco por vez (ex.: "Leia o CLAUDE.md e
o docs/roadmap.md e execute o marco M1"), revisando os critérios de aceite de cada um.
