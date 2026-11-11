# Referências

Material de origem do projeto. **Não é especificação.** Quando houver conflito, valem,
nesta ordem: `docs/regras-contabeis.md`, `docs/adr/`, `docs/gdd.md`.

| Arquivo | O que é | Como usar |
|---|---|---|
| `conceito-original.md` | Conceito inicial do jogo (v1.0) | Já incorporado ao `gdd.md` |
| `historia-campanha.md` | Campanha narrativa "O Primeiro Negócio" (capítulos 1–8) | Origem da campanha; versão oficial em `docs/campanha.md` |
| `mockup-retrato.png`, `mockup-paisagem.png` | Mockups gerados como norte visual | Só referência de estilo e de tom |
| `assets.md` | Registro de arte, som e fontes do jogo, com origem e licença | Atualizar a cada asset adicionado |
| `anki/*.apkg` | Deck Anki de estudo de Contabilidade (adicionado manualmente) | Fonte de ideias para afirmativas (ver abaixo) |

## História da campanha

Reconciliada em [`docs/campanha.md`](../campanha.md) e
[`docs/cenario-campanha.md`](../cenario-campanha.md) (ADR-0007, ADR-0008). Para
implementar, use esses documentos, não a história original.

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
