# ADR-0001 — Stack

**Status:** aceito

## Contexto
Jogo mobile em retrato, com um mapa 2D (avatar e NPCs) e muitos painéis de
formulário e tabela (lançamentos, Balanço, DRE). A equipe trabalha com TypeScript.

## Decisão
- TypeScript em monorepo **pnpm** (`apps/*`, `packages/*`).
- **Vite + React** para HUD e painéis; **Phaser** para o mapa e os personagens.
- **Zustand** para o estado do jogo; event bus tipado entre Phaser e React.
- **zod** para os schemas de conteúdo; **Vitest** para testes (+ fast-check).
- **Capacitor** para empacotar em Android/iOS.
- Persistência local em IndexedDB na v1.

## Consequências
- Um só stack para jogo, UI e motor; o motor contábil pode ser reaproveitado num
  backend no futuro.
- Painéis complexos ficam em React, onde formulários e tabelas são simples.
- Phaser e React convivem na mesma página: a integração (canvas + overlay) precisa
  ser cuidada desde o M0.
- Versões exatas das dependências são escolhidas no M0, com as estáveis mais recentes.
