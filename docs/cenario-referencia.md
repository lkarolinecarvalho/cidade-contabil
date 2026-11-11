# Cenário de referência (teste dourado)

Sequência completa de operações com os valores esperados, **centavo por centavo**.
Deve virar um teste de integração em `packages/ledger` e passar sempre.

Parâmetros: ICMS 18%, PIS 0,65%, COFINS 3,00%, um único produto ("Arroz 5 kg").
Valores calculados com arredondamento meio para cima por linha (R-GER-02).

## Operações

### Op 1 — Subscrição e integralização no mesmo ato (R-CAP-03, R-ENT-02)
Carteira pessoal: 12.000,00 → 2.000,00 (fora do razão). Subscrição e integralização
simultâneas: os lançamentos em (−) Capital a Integralizar se anulam, e o efeito líquido é:

| Conta | D | C |
|---|---:|---:|
| Caixa | 10.000,00 | |
| Capital Social Subscrito | | 10.000,00 |

### Op 2 — Depósito no banco
| Conta | D | C |
|---|---:|---:|
| Bancos Conta Movimento | 6.000,00 | |
| Caixa | | 6.000,00 |

### Op 3 — Compra a prazo, 30 dias (R-COM-03, R-ICMS-02)
100 un × R$ 30,00 = nota de R$ 3.000,00. ICMS 18% = 540,00. Custo = 2.460,00.

| Conta | D | C |
|---|---:|---:|
| Estoque de Mercadorias | 2.460,00 | |
| ICMS a Recuperar | 540,00 | |
| Fornecedores | | 3.000,00 |

Estoque: 100 un, R$ 2.460,00.

### Op 4 — Compra à vista via banco, com IPI e frete (R-COM-01, R-ICMS-03, R-IPI-01, R-FRE-01)
50 un × R$ 30,00 = 1.500,00; IPI 10% = 150,00; frete na nota = 50,00.
Total da nota = 1.700,00. Base do ICMS = 1.500 + 50 = 1.550,00 → ICMS = 279,00.
Custo = 1.700,00 − 279,00 = 1.421,00.

| Conta | D | C |
|---|---:|---:|
| Estoque de Mercadorias | 1.421,00 | |
| ICMS a Recuperar | 279,00 | |
| Bancos Conta Movimento | | 1.700,00 |

Estoque: 150 un, R$ 3.881,00 (médio ≈ 25,8733).

### Op 5 — Venda à vista: 80 un × R$ 50,00 = 4.000,00 (R-VEN-01/02)
ICMS = 720,00. Base PIS/COFINS = 3.280,00 → PIS 21,32; COFINS 98,40.
CMV = round(3.881,00 × 80 / 150) = 2.069,87.

| Conta | D | C |
|---|---:|---:|
| Caixa | 4.000,00 | |
| Receita Bruta de Vendas | | 4.000,00 |
| ICMS sobre Vendas | 720,00 | |
| ICMS a Recolher | | 720,00 |
| PIS sobre Faturamento | 21,32 | |
| PIS a Recolher | | 21,32 |
| COFINS sobre Faturamento | 98,40 | |
| COFINS a Recolher | | 98,40 |
| CMV | 2.069,87 | |
| Estoque de Mercadorias | | 2.069,87 |

Estoque: 70 un, R$ 1.811,13.

### Op 6 — Venda a prazo: 30 un × R$ 50,00 = 1.500,00
ICMS = 270,00. Base PIS/COFINS = 1.230,00 → PIS 7,995 → **8,00**; COFINS 36,90.
CMV = round(1.811,13 × 30 / 70) = 776,20.

| Conta | D | C |
|---|---:|---:|
| Clientes | 1.500,00 | |
| Receita Bruta de Vendas | | 1.500,00 |
| ICMS sobre Vendas | 270,00 | |
| ICMS a Recolher | | 270,00 |
| PIS sobre Faturamento | 8,00 | |
| PIS a Recolher | | 8,00 |
| COFINS sobre Faturamento | 36,90 | |
| COFINS a Recolher | | 36,90 |
| CMV | 776,20 | |
| Estoque de Mercadorias | | 776,20 |

Estoque: 40 un, R$ 1.034,93.

### Op 7 — Apuração do ICMS no fim do mês (R-ICMS-06)
A recolher 990,00; a recuperar 819,00 → compensa 819,00; saldo devedor 171,00.

| Conta | D | C |
|---|---:|---:|
| ICMS a Recolher | 819,00 | |
| ICMS a Recuperar | | 819,00 |

### Op 8 — Pagamento do ICMS no Posto Fiscal, via banco
| Conta | D | C |
|---|---:|---:|
| ICMS a Recolher | 171,00 | |
| Bancos Conta Movimento | | 171,00 |

### Op 9 — Pagamento ao fornecedor (vencimento da Op 3), via banco
| Conta | D | C |
|---|---:|---:|
| Fornecedores | 3.000,00 | |
| Bancos Conta Movimento | | 3.000,00 |

## Saldos finais esperados (antes do encerramento)

| Conta | Saldo |
|---|---:|
| Caixa | 8.000,00 D |
| Bancos Conta Movimento | 1.129,00 D |
| Clientes | 1.500,00 D |
| Estoque de Mercadorias | 1.034,93 D |
| ICMS a Recuperar | 0,00 |
| Fornecedores | 0,00 |
| ICMS a Recolher | 0,00 |
| PIS a Recolher | 29,32 C |
| COFINS a Recolher | 135,30 C |
| Capital Social Subscrito | 10.000,00 C |
| Receita Bruta de Vendas | 5.500,00 C |
| ICMS sobre Vendas | 990,00 D |
| PIS sobre Faturamento | 29,32 D |
| COFINS sobre Faturamento | 135,30 D |
| CMV | 2.846,07 D |

Balancete: total devedor = total credor = **15.664,62**.

## DRE do mês

| | R$ |
|---|---:|
| Receita Bruta de Vendas | 5.500,00 |
| (−) ICMS sobre Vendas | (990,00) |
| (−) PIS sobre Faturamento | (29,32) |
| (−) COFINS sobre Faturamento | (135,30) |
| **= Receita Líquida** | **4.345,38** |
| (−) CMV | (2.846,07) |
| **= Lucro Bruto / Resultado do período** | **1.499,31** |

## Balanço Patrimonial

| Ativo | | Passivo + PL | |
|---|---:|---|---:|
| Caixa | 8.000,00 | PIS a Recolher | 29,32 |
| Bancos | 1.129,00 | COFINS a Recolher | 135,30 |
| Clientes | 1.500,00 | **Passivo Circulante** | **164,62** |
| Estoque | 1.034,93 | Capital Social Subscrito | 10.000,00 |
| | | Resultado do período | 1.499,31 |
| | | **Patrimônio Líquido** | **11.499,31** |
| **Total do Ativo** | **11.663,93** | **Total Passivo + PL** | **11.663,93** |

Carteira pessoal do avatar (fora do razão): 2.000,00.
