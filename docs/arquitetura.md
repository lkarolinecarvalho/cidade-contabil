# Arquitetura

## Camadas

```
┌──────────────────────── apps/game ────────────────────────┐
│  Phaser (mundo)        React (HUD, painéis, telas)         │
│      │                        │                            │
│      └──── event bus tipado ──┘                            │
│                    │                                       │
│            store do jogo (Zustand)                         │
│     estado salvo: razão, estoque, calendário, progresso    │
│                    │                                       │
│        orquestrador de missão / sessão                     │
└────────────┬──────────────────────────┬───────────────────┘
             │                          │
   packages/ledger               packages/content
   (motor contábil puro)         (schemas + dados)
```

- **ledger:** plano de contas, lançamentos, razão, estoque com custo médio,
  tributos, apuração, balancete, DRE e balanço. Sem dependências de UI.
- **content:** schemas zod, carregamento e validação de missões, afirmativas, NPCs,
  produtos e estabelecimentos.
- **game:** Phaser renderiza o mapa e os personagens; React renderiza tudo que é
  painel. O orquestrador liga missão → operação → ledger → afirmativas.

## Fluxo de uma operação

1. Jogador aceita a proposta no painel de negociação (React).
2. O orquestrador monta a **Operação** de domínio a partir da missão.
3. `ledger.preverLancamentos(estado, operacao, parametros)` devolve os lançamentos
   esperados e o novo estado, **sem gravar**.
4. A UI mostra o efeito (contas que sobem e descem) e as afirmativas selecionadas.
5. O jogador monta ou confirma o lançamento. `ledger.compararLancamento(esperado, doJogador)`
   devolve acertos e erros por linha, para o feedback.
6. Ao concluir, `ledger.aplicar(estado, operacao)` grava **os lançamentos do motor**.
   O lançamento do jogador nunca entra no razão (ADR-0005).
7. A store persiste; o Phaser recebe eventos para animar o mundo (prateleira, NPC).

## Estado

- **Fonte da verdade:** a lista de lançamentos + o estado de estoque derivado.
  Saldos e demonstrações são **sempre calculados** a partir do razão.
- Estado do jogo serializável em JSON, com `versaoSchema` para migrações.
- Persistência local (IndexedDB) na v1. Backend fica para depois.

## API pública do ledger (proposta)

```ts
criarEmpresa(parametros): EstadoContabil
preverLancamentos(estado, operacao, data): { lancamentos, novoEstado }
aplicar(estado, operacao, data): EstadoContabil
compararLancamento(esperado, informado): ResultadoComparacao
simularLancamentoInformado(estado, informado, data): { dre, balanco }  // prévia do erro, nunca grava
depreciarMes(estado, mes): Operacao
saldos(estado, ate?): Saldo[]
balancete(estado, ate?): Balancete
dre(estado, periodo): DRE
balanco(estado, data): BalancoPatrimonial
apurarIcms(estado, mes): Operacao
```

O orquestrador e a UI só falam com o ledger por essa API.

## Testes

- `ledger`: Vitest, cobrindo cada regra (ID no nome do teste) e o
  [cenário de referência](cenario-referencia.md). Testes de propriedade (fast-check)
  para os invariantes de partidas dobradas e estoque.
- `content`: validação de todos os dados no teste.
- `game`: testes do orquestrador; UI com testes leves de componentes e verificação
  manual no navegador em viewport retrato (390×844).
