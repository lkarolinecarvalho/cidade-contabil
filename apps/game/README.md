# @cidade/game

App do jogo: Vite + React (HUD e painéis) + Phaser (mapa), empacotado com Capacitor.

```
src/
├── main.tsx     # monta a UI em React e, quando ela avisa, o mundo em Phaser
├── palco.ts     # viewport de referência em retrato (390×844)
├── arte/        # desenhos em SVG (prédios, personagens, cenário), usados pelo mundo e pela UI
├── world/       # Phaser: cenas, mapa, avatar, NPCs
├── ui/          # React: HUD, bottom sheet, painéis
├── state/       # estado do jogo (jogo.ts), calendário, repetição espaçada (estudo.ts) e a store
├── bus/         # event bus tipado Phaser ↔ React
├── orquestrador/ # ciclo da missão: efeito, seleção de afirmativas, ajuda e conferência do lançamento
└── texto/       # formatação de dinheiro, texto das afirmativas e das regras
```

- **Phaser e React não se importam.** Toda a comunicação passa por `bus/`.
- **A contabilidade vem do ledger.** `state/jogo.ts` guarda o `EstadoContabil` e a
  carteira pessoal do avatar em campos separados; a carteira nunca entra no razão
  (ADR-0004). O HUD lê Caixa + Bancos direto do razão.
- **A store é "vanilla"** (`jogoStore`), para o Phaser poder assinar; os componentes
  usam `useJogo(seletor)`.
- **Painéis** usam o `BottomSheet` genérico.

Testes de componente usam `renderToStaticMarkup`, sem DOM. A conferência visual é no
navegador, em viewport retrato de 390×844.
