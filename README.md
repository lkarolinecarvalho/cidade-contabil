# Cidade Contábil

Jogo mobile, em tela retrato, para aprender Contabilidade administrando uma empresa
numa cidade viva. Cada operação comercial gera um fato contábil. O jogador vê o
efeito no patrimônio, responde afirmativas Certo/Errado no estilo de banca e monta
os lançamentos.

**Público:** concurseiros (principal) e estudantes de Ciências Contábeis.

**Status:** estrutura inicial. A implementação começa pelo marco M0 do roadmap.

## Documentos

| Documento | Conteúdo |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Regras de trabalho para o agente de código |
| [docs/gdd.md](docs/gdd.md) | Design do jogo (versão refinada do conceito) |
| [docs/regras-contabeis.md](docs/regras-contabeis.md) | Plano de contas e regras contábeis/tributárias, com IDs |
| [docs/cenario-referencia.md](docs/cenario-referencia.md) | Cenário completo com valores esperados (teste dourado) |
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

1. Abra a pasta no VS Code com o Claude Code.
2. Peça: "Leia o CLAUDE.md e o docs/roadmap.md e execute o marco M0."
3. Avance um marco por vez, revisando os critérios de aceite de cada um.
