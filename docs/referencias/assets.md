# Assets e licenças

Registro de toda arte, som e fonte usados no jogo, com origem e licença. Nada entra no
repositório sem uma linha aqui.

## Direção visual

Os mockups `mockup-retrato.png` e `mockup-paisagem.png` são o norte: vila em tons
quentes, prédios e personagens ilustrados, painéis em papel creme com faixa
verde-escura, contorno marrom e cantos arredondados. O tema da interface está em
`apps/game/src/estilos.css`.

## Arte atual (v1)

Toda a arte é **vetorial, desenhada em código** pelo próprio projeto, em
`apps/game/src/arte/`. Não há imagens de terceiros.

| Elemento | Arquivo | Licença |
|---|---|---|
| Fachadas dos 6 estabelecimentos | `arte/edificios.ts` | Código do próprio projeto |
| Avatar e NPCs (corpo inteiro e retrato) | `arte/personagens.ts` | Código do próprio projeto |
| Cenário: grama, rua de pedra, árvores, postes, bancos | `arte/cenario.ts` | Código do próprio projeto |
| Ícones da interface | `ui/icones.tsx` | Código do próprio projeto |

É arte vetorial simples, mais próxima dos mockups que um placeholder, mas não é a
ilustração pintada deles. Para chegar lá, os desenhos de `arte/` podem ser trocados por
imagens (PNG ou SVG) com os mesmos tamanhos, sem mexer no resto do jogo.

## Assets de terceiros

| Arquivo ou pacote | Origem | Autor | Licença | Exige atribuição? |
|---|---|---|---|---|
| Fonte Nunito (pacote npm `@fontsource-variable/nunito`) | https://fontsource.org/fonts/nunito | The Nunito Project Authors | SIL Open Font License 1.1 | Não para uso; a licença deve acompanhar a fonte se ela for redistribuída |

## Ao adicionar um asset

Inclua uma linha na tabela acima. Use só licenças que permitam uso comercial (por
exemplo CC0, CC BY, MIT, OFL). Se a licença exigir atribuição, registre também o texto
de crédito que o jogo deve mostrar.
