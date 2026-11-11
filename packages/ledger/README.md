# @cidade/ledger

Motor contábil puro em TypeScript: plano de contas, lançamentos, razão, estoque com
custo médio, tributos (ICMS, IPI, PIS/COFINS cumulativo), apuração do ICMS, balancete,
DRE e Balanço Patrimonial.

- Sem dependências de UI, DOM ou I/O. Funções determinísticas.
- Regras em [`docs/regras-contabeis.md`](../../docs/regras-contabeis.md); cada regra
  com ID e teste.
- Teste dourado: [`docs/cenario-referencia.md`](../../docs/cenario-referencia.md).
- API pública proposta em [`docs/arquitetura.md`](../../docs/arquitetura.md).

Implementação no marco **M1**.
