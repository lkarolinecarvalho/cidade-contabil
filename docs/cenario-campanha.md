# Cenário da campanha (teste dourado principal)

Capítulos 1–7 da campanha ([campanha.md](campanha.md)), com os valores esperados
**centavo por centavo**. Deve virar um teste de integração em `packages/ledger`. O
[cenário de tributos](cenario-referencia.md) continua valendo como teste isolado de
tributos e custo médio.

Parâmetros: ICMS 18%, PIS 0,65%, COFINS 3,00%. Produto único ("Mercadorias diversas",
nota a R$ 5,00/un). Vidas úteis: Edificações 25 anos, Móveis 10, Equipamentos 5.
Acionistas: avatar 90%, NPC minoritário 10%. Carteira inicial do avatar: R$ 280.000,00.

## Capítulo 1 — Nasce uma empresa

**C1.2 — Capital autorizado de R$ 500.000,00:** sem lançamento (R-CAP-02).

**C1.3 — Subscrição de R$ 300.000,00** (avatar 270.000; NPC 30.000)

| Conta | D | C |
|---|---:|---:|
| (−) Capital a Integralizar | 300.000,00 | |
| Capital Social Subscrito | | 300.000,00 |

**C1.4 — Integralização de R$ 200.000,00 no banco** (avatar 180.000; NPC 20.000).
Carteira do avatar: 280.000 → 100.000.

| Conta | D | C |
|---|---:|---:|
| Bancos Conta Movimento | 200.000,00 | |
| (−) Capital a Integralizar | | 200.000,00 |

PL: 300.000 − 100.000 = **200.000,00**.

## Capítulo 2 — Comprando o terreno e a loja

**C2.7 — Imóvel de uso próprio, à vista** (R-IMO-02, R-IMO-04, R-IMO-06)

| Conta | D | C |
|---|---:|---:|
| Terrenos | 60.000,00 | |
| Edificações | 120.000,00 | |
| Bancos Conta Movimento | | 180.000,00 |

Bancos: 20.000,00.

## Capítulo 3 — Integralizando o capital e equipando a loja

**C3.8 — Integralização dos R$ 100.000,00 restantes** (avatar 90.000; NPC 10.000).
Carteira do avatar: 100.000 → 10.000.

| Conta | D | C |
|---|---:|---:|
| Bancos Conta Movimento | 100.000,00 | |
| (−) Capital a Integralizar | | 100.000,00 |

**C3.9 — Móveis e equipamentos, à vista** (R-IMO-05)

| Conta | D | C |
|---|---:|---:|
| Móveis e Utensílios | 15.000,00 | |
| Bancos Conta Movimento | | 15.000,00 |
| Equipamentos | 5.000,00 | |
| Bancos Conta Movimento | | 5.000,00 |

Bancos: 100.000,00.

## Capítulo 4 — Comprando as mercadorias (tributos entram aqui)

**C4.10 — Compra à vista via banco:** 8.000 un × R$ 5,00 = nota de R$ 40.000,00.
ICMS 18% = 7.200,00 → custo 32.800,00 (R$ 4,10/un).

| Conta | D | C |
|---|---:|---:|
| Estoque de Mercadorias | 32.800,00 | |
| ICMS a Recuperar | 7.200,00 | |
| Bancos Conta Movimento | | 40.000,00 |

**C4.11 — Compra a prazo, 30 dias:** 4.000 un × R$ 5,00 = R$ 20.000,00.
ICMS = 3.600,00 → custo 16.400,00.

| Conta | D | C |
|---|---:|---:|
| Estoque de Mercadorias | 16.400,00 | |
| ICMS a Recuperar | 3.600,00 | |
| Fornecedores | | 20.000,00 |

Estoque: 12.000 un, R$ 49.200,00 (médio R$ 4,10). Bancos: 60.000,00.

## Capítulo 5 — A grande inauguração

**C5.12 — Venda à vista:** 50 un × R$ 10,00 = 500,00. ICMS 90,00; base PIS/COFINS
410,00 → PIS 2,665 → **2,67**; COFINS 12,30. CMV 50 × 4,10 = 205,00.

| Conta | D | C |
|---|---:|---:|
| Caixa | 500,00 | |
| Receita Bruta de Vendas | | 500,00 |
| ICMS sobre Vendas | 90,00 | |
| ICMS a Recolher | | 90,00 |
| PIS sobre Faturamento | 2,67 | |
| PIS a Recolher | | 2,67 |
| COFINS sobre Faturamento | 12,30 | |
| COFINS a Recolher | | 12,30 |
| CMV | 205,00 | |
| Estoque de Mercadorias | | 205,00 |

**C5.13 — Venda a prazo ao restaurante:** 300 un × R$ 10,00 = 3.000,00. ICMS 540,00;
base 2.460,00 → PIS 15,99; COFINS 73,80. CMV 1.230,00.

| Conta | D | C |
|---|---:|---:|
| Clientes | 3.000,00 | |
| Receita Bruta de Vendas | | 3.000,00 |
| ICMS sobre Vendas | 540,00 | |
| ICMS a Recolher | | 540,00 |
| PIS sobre Faturamento | 15,99 | |
| PIS a Recolher | | 15,99 |
| COFINS sobre Faturamento | 73,80 | |
| COFINS a Recolher | | 73,80 |
| CMV | 1.230,00 | |
| Estoque de Mercadorias | | 1.230,00 |

Estoque: 11.650 un, R$ 47.765,00.

## Capítulo 6 — Pagando as obrigações

| Op | Conta | D | C |
|---|---|---:|---:|
| C6.14 Pagamento parcial ao fornecedor | Fornecedores | 10.000,00 | |
| | Bancos Conta Movimento | | 10.000,00 |
| C6.15 Salários do mês | Despesas com Salários | 4.000,00 | |
| | Salários a Pagar | | 4.000,00 |
| C6.15 Pagamento dos salários | Salários a Pagar | 4.000,00 | |
| | Bancos Conta Movimento | | 4.000,00 |
| C6.16 Energia elétrica | Despesa com Energia Elétrica | 1.000,00 | |
| | Bancos Conta Movimento | | 1.000,00 |

Bancos: 45.000,00.

## Capítulo 7 — O primeiro fechamento

**C7.a — Depreciação do mês** (R-DEP-01 a 04)

| Conta | D | C |
|---|---:|---:|
| Despesa de Depreciação | 400,00 | |
| (−) Depreciação Acumulada — Edificações | | 400,00 |
| Despesa de Depreciação | 125,00 | |
| (−) Depreciação Acumulada — Móveis e Utensílios | | 125,00 |
| Despesa de Depreciação | 83,33 | |
| (−) Depreciação Acumulada — Equipamentos | | 83,33 |

**C7.b — Apuração do ICMS no Posto Fiscal:** a recolher 630,00; a recuperar 10.800,00
→ compensa 630,00. **Saldo credor de 10.170,00**, que fica para o mês seguinte.
Não há ICMS a pagar.

| Conta | D | C |
|---|---:|---:|
| ICMS a Recolher | 630,00 | |
| ICMS a Recuperar | | 630,00 |

## DRE do mês

| | R$ |
|---|---:|
| Receita Bruta de Vendas | 3.500,00 |
| (−) ICMS sobre Vendas | (630,00) |
| (−) PIS sobre Faturamento | (18,66) |
| (−) COFINS sobre Faturamento | (86,10) |
| **= Receita Líquida** | **2.765,24** |
| (−) CMV | (1.435,00) |
| **= Lucro Bruto** | **1.330,24** |
| (−) Despesas com Salários | (4.000,00) |
| (−) Despesa com Energia Elétrica | (1.000,00) |
| (−) Despesa de Depreciação | (608,33) |
| **= Resultado do período** | **(4.278,09) — prejuízo** |

## Balanço Patrimonial

| Ativo | R$ |
|---|---:|
| Caixa | 500,00 |
| Bancos Conta Movimento | 45.000,00 |
| Clientes | 3.000,00 |
| Estoque de Mercadorias | 47.765,00 |
| ICMS a Recuperar | 10.170,00 |
| **Ativo Circulante** | **106.435,00** |
| Terrenos | 60.000,00 |
| Edificações (120.000,00 − 400,00) | 119.600,00 |
| Móveis e Utensílios (15.000,00 − 125,00) | 14.875,00 |
| Equipamentos (5.000,00 − 83,33) | 4.916,67 |
| **Ativo Não Circulante — Imobilizado** | **199.391,67** |
| **Total do Ativo** | **305.826,67** |

| Passivo + PL | R$ |
|---|---:|
| Fornecedores | 10.000,00 |
| PIS a Recolher | 18,66 |
| COFINS a Recolher | 86,10 |
| **Passivo Circulante** | **10.104,76** |
| Capital Social Subscrito | 300.000,00 |
| (−) Capital a Integralizar | 0,00 |
| Resultado do período | (4.278,09) |
| **Patrimônio Líquido** | **295.721,91** |
| **Total Passivo + PL** | **305.826,67** |

Balancete: total devedor = total credor = **314.213,09**.
Carteira pessoal do avatar (fora do razão): **10.000,00**.

## Diferenças em relação à história original

- Compras e vendas com tributos a partir do capítulo 4 (decisão do projeto).
- Quantidades e preço unitário definidos para o custo médio funcionar.
- Depreciação incluída no fechamento do capítulo 7, porque os bens já estão em uso no
  mês e omiti-la deixaria o balanço tecnicamente errado. Na história, ela aparecia só
  no capítulo 8.
- Acionista NPC minoritário (10%), porque S.A. exige ao menos dois acionistas.
