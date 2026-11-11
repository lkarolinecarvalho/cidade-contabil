# @cidade/game

App do jogo: Vite + React (HUD e painéis) + Phaser (mapa), empacotado com Capacitor.

Organização sugerida para o M0/M3:

```
src/
├── main.tsx            # monta React e o canvas do Phaser
├── world/              # Phaser: cenas, mapa, avatar, NPCs
├── ui/                 # React: HUD, bottom sheets, painéis, telas do Escritório
├── state/              # store (Zustand), persistência, migrações
├── bus/                # event bus tipado Phaser ↔ React
└── orquestrador/       # fluxo de missão: operação → ledger → afirmativas
```

Viewport de referência: 390×844 (retrato).
