# Assets e licenças

Registro de toda arte, som e fonte usados no jogo, com origem e licença. Nada entra no
repositório sem uma linha aqui.

## Direção visual

Os mockups `mockup-retrato.png` e `mockup-paisagem.png` são o norte: vila em tons
quentes, prédios e personagens ilustrados, painéis em papel creme com faixa
verde-escura, contorno marrom e cantos arredondados. O tema da interface está em
`apps/game/src/estilos.css`.

## Arte atual (v2)

Toda a arte é **vetorial, desenhada em código** pelo próprio projeto, em
`apps/game/src/arte/`. Não há imagens de terceiros.

O mapa usa **projeção isométrica com blocos** (estilo "voxel"): cada prédio, árvore e
boneco é montado com caixas de três faces (topo claro, face esquerda na cor base, face
direita mais escura). As primitivas ficam em `arte/iso.ts`.

| Elemento | Arquivo | Licença |
|---|---|---|
| Primitivas isométricas (caixa, faces, sombreamento) | `arte/iso.ts` | Código do próprio projeto |
| Os 6 estabelecimentos em blocos, virados para a direita ou para a esquerda | `arte/edificios.ts` | Código do próprio projeto |
| Bonecos do mapa (avatar e NPCs) | `arte/bonecos.ts` | Código do próprio projeto |
| Retratos do avatar e dos NPCs (HUD e diálogos) | `arte/personagens.ts` | Código do próprio projeto |
| Chão (gramado, ladrilhos, praça) e enfeites (árvores, postes, bancos, fonte, canteiros, barraca) | `arte/cenario.ts` | Código do próprio projeto |
| Ícones da interface | `ui/icones.tsx` | Código do próprio projeto |

A planta do mapa (posição dos prédios, caminhos e enfeites) fica em
`world/mapa.ts` e `world/enfeites.ts`. Os retratos do HUD e dos diálogos ainda são os
desenhos de frente da v1, não em blocos.

## Assets de terceiros

| Arquivo ou pacote | Origem | Autor | Licença | Exige atribuição? |
|---|---|---|---|---|
| Fonte Nunito (pacote npm `@fontsource-variable/nunito`) | https://fontsource.org/fonts/nunito | The Nunito Project Authors | SIL Open Font License 1.1 | Não para uso; a licença deve acompanhar a fonte se ela for redistribuída |

## Ao adicionar um asset

Inclua uma linha na tabela acima. Use só licenças que permitam uso comercial (por
exemplo CC0, CC BY, MIT, OFL). Se a licença exigir atribuição, registre também o texto
de crédito que o jogo deve mostrar.
