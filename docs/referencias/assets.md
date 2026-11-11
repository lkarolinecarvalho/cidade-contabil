# Assets e licenças

Registro de toda arte, som e fonte usados no jogo, com origem e licença. Nada entra no
repositório sem uma linha aqui.

## Situação atual (v1, placeholder)

O jogo **não usa nenhum asset externo**. Tudo o que aparece no mapa é desenhado em
código, com formas geométricas do Phaser, em `apps/game/src/world/CenaCidade.ts`:

| Elemento | Como é feito | Licença |
|---|---|---|
| Edifícios, rua, calçadas | Retângulos coloridos (`Graphics`) | Código do próprio projeto |
| Avatar e NPCs | Círculos (`Arc`, `Ellipse`) | Código do próprio projeto |
| Indicador de oferta ("!") | Círculo + texto | Código do próprio projeto |
| Textos | Fonte do sistema do aparelho (`system-ui`) | Não é distribuída com o jogo |

## Ao adicionar um asset

Inclua uma linha por arquivo ou pacote:

| Arquivo ou pacote | Origem (URL) | Autor | Licença | Exige atribuição? |
|---|---|---|---|---|
| — | — | — | — | — |

Use só licenças que permitam uso comercial (por exemplo CC0, CC BY, MIT). Se a licença
exigir atribuição, registre também o texto de crédito que o jogo deve mostrar.
