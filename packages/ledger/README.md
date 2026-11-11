# @cidade/ledger

Motor contábil puro em TypeScript: plano de contas, lançamentos, razão, estoque com
custo médio, tributos (ICMS, IPI, PIS/COFINS cumulativo), apuração do ICMS, depreciação,
balancete, DRE e Balanço Patrimonial.

- Sem dependências de UI, DOM ou I/O. Funções determinísticas; a data do jogo entra
  como parâmetro.
- Regras em [`docs/regras-contabeis.md`](../../docs/regras-contabeis.md); cada regra é
  citada pelo ID no código e tem teste.
- Dinheiro em centavos inteiros; alíquotas em pontos-base (18% = 1800).

## Uso

```ts
import { aplicar, balanco, criarEmpresa, dre, preverLancamentos } from "@cidade/ledger";

const dia = (d: number) => ({ ano: 1, mes: 1, dia: d });
let estado = criarEmpresa();
estado = aplicar(estado, { tipo: "subscricao", valorCentavos: 300_000_00 }, dia(1));
estado = aplicar(estado, { tipo: "integralizacao", valorCentavos: 200_000_00, meio: "bancos" }, dia(1));

// Lançamentos esperados de uma operação, sem gravar:
const { lancamentos, valores } = preverLancamentos(estado, operacao, dia(4));

dre(estado, { de: dia(1), ate: dia(30) });
balanco(estado, dia(30));
```

Operação bloqueada lança `ErroDeOperacao` (com `codigo` e, quando houver, `regra`) e
não altera o estado.

## Organização

| Arquivo | Conteúdo |
|---|---|
| `motor.ts` | `criarEmpresa`, `preverLancamentos`, `aplicar`, `depreciarMes`, `apurarIcms` |
| `razao.ts` | `saldos`, `balancete` |
| `demonstracoes.ts` | `dre`, `balanco` |
| `comparacao.ts` | `compararLancamento`, `simularLancamentoInformado` (prévia do erro) |
| `estoque.ts` | inventário permanente com custo médio ponderado móvel |
| `plano-de-contas.ts`, `parametros.ts` | configuração: contas, alíquotas, vidas úteis, notas didáticas |
| `regras.ts` | lista dos IDs de regra, conferida contra o documento |

## Testes

- `cenario-campanha.test.ts` e `cenario-referencia.test.ts`: testes dourados, centavo
  por centavo.
- `regras.test.ts`: um teste por regra, com o ID no nome.
- `cobertura-regras.test.ts`: falha se uma regra do documento ficar sem teste ou se
  uma simplificação 📘 ficar sem nota didática.
- `invariantes.test.ts`: testes de propriedade (fast-check) dos invariantes.
- `comparacao.test.ts`: comparação do lançamento do jogador e prévia dos erros didáticos.

## Casos que o motor recusa por não estarem nas regras

O motor não inventa regra. Estes casos lançam `ErroDeOperacao` até serem definidos em
`docs/regras-contabeis.md`:

- compra ou venda com mais de um produto (rateio de frete e tributos entre produtos);
- pagamento de PIS/COFINS (R-PC-04) e despesas diferentes de energia elétrica;
- saque, venda à vista recebida em Bancos e compra de imobilizado a prazo (não existem
  como operação).
