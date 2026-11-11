# Referências

Material de origem do projeto. **Não é especificação.** Quando houver conflito, valem,
nesta ordem: `docs/regras-contabeis.md`, `docs/adr/`, `docs/gdd.md`.

| Arquivo | O que é | Como usar |
|---|---|---|
| `conceito-original.md` | Conceito inicial do jogo (v1.0) | Já incorporado ao `gdd.md` |
| `historia-campanha.md` | Campanha narrativa "O Primeiro Negócio" (capítulos 1–8) | Direção para a campanha e as missões. **Ainda não reconciliada** com o GDD e as regras (ver abaixo) |
| `mockup-retrato.png`, `mockup-paisagem.png` | Mockups gerados como norte visual | Só referência de estilo e de tom |
| `anki/*.apkg` | Deck Anki de estudo de Contabilidade (adicionado manualmente) | Fonte de ideias para afirmativas (ver abaixo) |

## História da campanha: pendências de reconciliação

Antes de transformar a história em missões, é preciso decidir:

1. **Tributos.** A história é didática e sem tributos; a v1 inclui ICMS, IPI e
   PIS/COFINS (ADR-0002). Falta definir em que capítulo os tributos entram e ajustar os
   valores das compras e vendas a partir dele.
2. **Escopo do MVP.** A história traz imobilizado (terreno, edificações, móveis),
   salários e despesas nos capítulos 2, 3 e 6, que hoje estão fora do MVP (`gdd.md`, seção 11).
3. **Estabelecimentos.** A história usa Imobiliária; o MVP atual usa o Posto Fiscal.
4. **Sociedade anônima.** A empresa é S.A., com capital autorizado, subscrito e a
   integralizar. Isso exige novas contas e regras em `regras-contabeis.md`, e a
   definição de quem são os acionistas em relação à carteira do avatar (ADR-0004).
5. **Erro do jogador.** A seção 11 da história fala em mostrar a inconsistência quando
   o jogador erra. Isso deve ser uma *prévia* do balanço errado, nunca uma gravação
   no razão (ADR-0005).

Até a reconciliação, **não implemente missões a partir da história**.

## Deck Anki

- Coloque o arquivo em `docs/referencias/anki/` (ex.: `contabilidade.apkg`).
- Um `.apkg` é um zip com um banco SQLite (`collection.anki2` ou `collection.anki21`)
  e mídia. Os cards ficam na tabela `notes`, campo `flds` (campos separados por `\x1f`).
- Uso previsto: um script em `packages/content/scripts/` extrai os cards para um
  arquivo de **candidatos**. Cada candidato vira uma afirmativa C/E só depois de
  revisado e associado a um `conceitoId` e às `regras` (`modelo-de-conteudo.md`).
  Nada entra direto no jogo sem revisão.
- Se o deck for de terceiros, confira a licença antes de usar o conteúdo e mantenha o
  repositório privado. Se o arquivo for grande, avalie Git LFS.
