# Roadmap da v1

Trabalhe **um marco por vez**. Um marco só termina quando todos os critérios de aceite
passam e os testes e o typecheck estão verdes.

## M0 — Fundação do monorepo
- pnpm workspaces, TypeScript strict (`tsconfig.base.json`), Vitest, linter/formatter
  (Biome ou ESLint + Prettier: escolher e registrar em ADR).
- `apps/game` com Vite + React + Phaser rodando uma tela vazia em retrato.
- Scripts na raiz: `dev`, `test`, `typecheck`, `lint`, `build`.
- CI simples (GitHub Actions): lint, typecheck e test.
- **Aceite:** `pnpm install && pnpm test && pnpm typecheck && pnpm dev` funcionam;
  CLAUDE.md atualizado com os comandos reais.

## M1 — Motor contábil (`packages/ledger`)
- Plano de contas como config; lançamentos; razão; saldos; balancete.
- Capital social de S.A. (subscrição, integralização, capital a integralizar).
- Imobilizado e depreciação mensal; despesas e obrigações.
- Estoque permanente com custo médio móvel.
- Tributos: ICMS, IPI, frete, PIS/COFINS cumulativo, apuração do ICMS.
- DRE e Balanço (com "Resultado do período" no PL).
- Prévia do erro (`simularLancamentoInformado`).
- **Aceite:** um teste por regra de `regras-contabeis.md`; `cenario-campanha.md` e
  `cenario-referencia.md` passam centavo por centavo; testes de propriedade dos invariantes.

## M2 — Conteúdo (`packages/content`)
- Schemas zod de missão, afirmativa, NPC, produto e estabelecimento.
- Carregador com validação e as regras de `modelo-de-conteudo.md`.
- Missões dos capítulos 1–7 da campanha (`campanha.md`) e ~50 afirmativas (≥3 por conceito).
- Opcional: script que extrai os cards do deck Anki (`docs/referencias/anki/`) para um
  arquivo de candidatos a afirmativa, para revisão manual.
- **Aceite:** todo o conteúdo valida; teste falha com conteúdo inválido.

## M3 — Casca do app e HUD
- Layout retrato, HUD (carteira pessoal x caixa da empresa, pontos, dia/mês).
- Store (Zustand) com o estado do jogo; event bus tipado Phaser ↔ React.
- Bottom sheet genérico para os painéis.
- **Aceite:** HUD reflete o estado do ledger; a carteira pessoal nunca aparece no razão.

## M4 — Mapa da cidade
- Mapa pequeno com os 6 estabelecimentos do MVP, tocar para andar, NPCs com
  indicador de oferta.
- Arte placeholder ou pacote livre (registrar a licença em `docs/referencias/assets.md`).
- **Aceite:** andar até um estabelecimento abre o painel correspondente.

## M5 — Loop da missão
- Negociação → efeito → afirmativas → lançamento → conclusão, ligado ao ledger.
- Painel de efeito (contas que sobem e descem) e painel de lançamento com os 4 níveis
  de ajuda.
- Feedback de erro por linha do lançamento, com a regra.
- Prévia do erro com comentário do contador (`campanha.md`, "Erros didáticos").
- **Aceite:** a campanha dos capítulos 1–7 pode ser jogada de ponta a ponta, e a DRE e o
  Balanço do jogo batem com `cenario-campanha.md`.

## M6 — Calendário e fechamento
- Dias, ações por dia, vencimentos de títulos, alertas.
- Apuração do ICMS no Posto Fiscal; fechamento mensal com DRE e afirmativas.
- **Aceite:** um mês completo jogado termina com apuração e DRE corretas.

## M7 — Revisão, repetição espaçada e modo banca
- Caixas de Leitner por conceito, seleção conforme `fluxo-afirmativas.md`.
- Tela de Revisão no Escritório; tela de Progresso; modo banca nas Configurações.
- **Aceite:** errar um conceito faz ele voltar; acertos o espaçam; o modo banca
  pontua +1/−1/0.

## M8 — Persistência e mobile
- Salvamento em IndexedDB com versão de schema e migração.
- Empacotar com Capacitor (Android primeiro).
- **Aceite:** fechar e reabrir o app mantém o progresso; o build Android roda num aparelho.

## Depois da v1
Capítulo 8 da campanha (empréstimos, veículos, propriedade para investimento,
inadimplência, fechamento anual), Prefeitura e taxas, Transportadora, encargos da folha, Lucro Real (créditos de PIS/COFINS), modo pós-reforma
(CBS/IBS), arte final, conta online e sincronização.
