# @cidade/content

Schemas zod e dados do jogo: missões, afirmativas, conceitos, NPCs, produtos e
estabelecimentos.

- Formato e regras de validação em
  [`docs/modelo-de-conteudo.md`](../../docs/modelo-de-conteudo.md).
- Todo dado é validado nos testes; conteúdo inválido quebra o CI.
- Depende de `@cidade/ledger` para a lista de regras e para os tipos das operações.

## Dados (`data/`)

| Arquivo | Conteúdo |
|---|---|
| `estabelecimentos.json` | os 6 estabelecimentos do MVP |
| `npcs.json` | personagens e onde atendem |
| `produtos.json` | produtos negociados |
| `conceitos.json` | conceitos cobrados nas afirmativas, com o nível em que aparecem |
| `missoes/*.json` | uma missão por arquivo; capítulos 1 a 7 da campanha |
| `afirmativas/*.json` | listas de afirmativas Certo/Errado, agrupadas por assunto |

## Uso

```ts
import { carregarConteudoDoJogo, paraOperacaoDoMotor } from "@cidade/content";

const conteudo = carregarConteudoDoJogo(); // lança ErroDeConteudo se algo estiver errado
const [missao] = conteudo.missoes;         // já em ordem de jogo
const operacao = paraOperacaoDoMotor(missao.operacoes[0], { mes: { ano: 1, mes: 1 } });
```

A missão declara a operação; o lançamento é calculado pelo ledger (ADR-0005).

## Testes

- `conteudo.test.ts`: todo o conteúdo valida, e cada regra de validação falha com
  conteúdo inválido.
- `campanha.test.ts`: as missões dos capítulos 1 a 7, jogadas em ordem pelo motor,
  chegam à DRE e ao Balanço de `docs/cenario-campanha.md`.

## Como escrever uma afirmativa

- Uma ideia por afirmativa, no estilo de banca, com explicação de até duas frases.
- `regras` cita os IDs de `docs/regras-contabeis.md` que sustentam o gabarito. Não
  escreva afirmativa sobre algo que as regras não cobrem.
- Cada conceito precisa de pelo menos 3 afirmativas, com gabaritos C e E.
