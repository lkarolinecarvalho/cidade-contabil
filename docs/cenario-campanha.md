# Cenário da campanha — "Chapa da Praça" (teste dourado)

Campanha da hamburgueria, mês 1, do contrato social ao primeiro fechamento. É o teste
dourado principal: `packages/ledger/src/cenario-campanha.test.ts` executa estas
operações pelo motor e confere cada lançamento, centavo por centavo.

Os valores abaixo foram calculados **fora do motor**, à mão (por um script de
conferência independente), seguindo `docs/regras-contabeis.md`.

## Premissas

- Sociedade limitada: o avatar tem 90% das quotas e o Sr. Osvaldo, 10% (R-CAP-01).
- Carteira pessoal do avatar no início: R$ 100.000,00. Ela fica fora do razão
  (R-ENT-01) e termina com R$ 10.000,00, depois de integralizar R$ 90.000,00.
- ICMS de 18% por dentro; PIS de 0,65% e COFINS de 3% sobre a receita sem o ICMS.
- Catálogo da hamburgueria (R-INS-01). Cada hambúrguer consome 1 pão, 1 carne, 1 queijo
  e 1 alface (R-INS-03); cada hambúrguer congelado, 1 carne e 1 embalagem (R-PRD-01).
- Vida útil: edificações 25 anos, móveis e utensílios 10, equipamentos 5 (R-DEP-01).
- As operações 27 a 30 são do último dia do mês (dia 30).

## Operações e lançamentos

**1. Subscrição do capital — R$ 100.000,00**

| D/C | Conta | Valor |
|---|---|---|
| D | (−) Capital a Integralizar | 100.000,00 |
| C | Capital Social Subscrito | 100.000,00 |

**2. Integralização de R$ 80.000,00 no banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Bancos Conta Movimento | 80.000,00 |
| C | (−) Capital a Integralizar | 80.000,00 |

**3. Compra do ponto comercial: terreno R$ 20.000,00 e edificação R$ 40.000,00, pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Terrenos | 20.000,00 |
| D | Edificações | 40.000,00 |
| C | Bancos Conta Movimento | 60.000,00 |

**4. Integralização final de R$ 20.000,00 no banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Bancos Conta Movimento | 20.000,00 |
| C | (−) Capital a Integralizar | 20.000,00 |

**5. Mesas e balcão por R$ 6.000,00, pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Móveis e Utensílios | 6.000,00 |
| C | Bancos Conta Movimento | 6.000,00 |

**6. Chapa e freezer por R$ 12.000,00, pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Equipamentos | 12.000,00 |
| C | Bancos Conta Movimento | 12.000,00 |

**7. Compra à vista (banco) de 500 refrigerantes a R$ 3,00, com IPI de 4%**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Mercadorias | 1.290,00 |
| D | ICMS a Recuperar | 270,00 |
| C | Bancos Conta Movimento | 1.560,00 |

**8. Compra a prazo (nota c1): 1.000 pães a R$ 1,00, 1.000 carnes a R$ 4,00, 1.000 queijos a R$ 1,00 e 1.000 alfaces a R$ 0,50**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 5.330,00 |
| D | ICMS a Recuperar | 1.170,00 |
| C | Fornecedores | 6.500,00 |

**9. Inauguração: venda à vista de 300 hambúrgueres a R$ 20,00 e 200 refrigerantes a R$ 6,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Caixa | 7.200,00 |
| C | Receita Bruta de Vendas | 7.200,00 |
| D | ICMS sobre Vendas | 1.296,00 |
| C | ICMS a Recolher | 1.296,00 |
| D | PIS sobre Faturamento | 38,38 |
| C | PIS a Recolher | 38,38 |
| D | COFINS sobre Faturamento | 177,12 |
| C | COFINS a Recolher | 177,12 |
| D | Custo das Mercadorias Vendidas (CMV) | 516,00 |
| C | Estoque de Mercadorias | 516,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.599,00 |
| C | Estoque de Insumos | 1.599,00 |

**10. Devolução de 100 carnes da nota c1**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 400,00 |
| C | Estoque de Insumos | 328,00 |
| C | ICMS a Recuperar | 72,00 |

**11. Abatimento de R$ 100,00 sobre o pão da nota c1**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 100,00 |
| C | Estoque de Insumos | 100,00 |

**12. Compra a prazo (nota c2) de 500 carnes a R$ 4,00, com 10% de desconto na nota**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 1.476,00 |
| D | ICMS a Recuperar | 324,00 |
| C | Fornecedores | 1.800,00 |

**13. Pagamento antecipado da nota c1 (R$ 6.000,00), pelo banco, com desconto de R$ 120,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 6.000,00 |
| C | Bancos Conta Movimento | 5.880,00 |
| C | Descontos Financeiros Obtidos | 120,00 |

**14. Compra à vista (caixa) de 20 unidades de material de limpeza a R$ 25,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Material de Consumo | 500,00 |
| C | Caixa | 500,00 |

**15. Encomenda a prazo (nota v1): 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00, com 10% de desconto na nota**

| D/C | Conta | Valor |
|---|---|---|
| D | Clientes | 4.140,00 |
| D | Descontos Incondicionais Concedidos | 460,00 |
| C | Receita Bruta de Vendas | 4.600,00 |
| D | ICMS sobre Vendas | 745,20 |
| C | ICMS a Recolher | 745,20 |
| D | PIS sobre Faturamento | 22,07 |
| C | PIS a Recolher | 22,07 |
| D | COFINS sobre Faturamento | 101,84 |
| C | COFINS a Recolher | 101,84 |
| D | Custo das Mercadorias Vendidas (CMV) | 258,00 |
| C | Estoque de Mercadorias | 258,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.007,61 |
| C | Estoque de Insumos | 1.007,61 |

**16. Devolução de 20 refrigerantes da nota v1**

| D/C | Conta | Valor |
|---|---|---|
| D | Devoluções de Vendas | 108,00 |
| C | Clientes | 108,00 |
| D | ICMS a Recolher | 19,44 |
| C | ICMS sobre Vendas | 19,44 |
| D | PIS a Recolher | 0,58 |
| C | PIS sobre Faturamento | 0,58 |
| D | COFINS a Recolher | 2,66 |
| C | COFINS sobre Faturamento | 2,66 |
| D | Estoque de Mercadorias | 51,60 |
| C | Custo das Mercadorias Vendidas (CMV) | 51,60 |

**17. Abatimento de R$ 100,00 sobre a encomenda**

| D/C | Conta | Valor |
|---|---|---|
| D | Abatimentos sobre Vendas | 100,00 |
| C | Clientes | 100,00 |

**18. Recebimento antecipado da nota v1 (R$ 3.932,00), pelo banco, com desconto de R$ 78,64**

| D/C | Conta | Valor |
|---|---|---|
| D | Bancos Conta Movimento | 3.853,36 |
| D | Descontos Financeiros Concedidos | 78,64 |
| C | Clientes | 3.932,00 |

**19. Recebimento de 300 refrigerantes em consignação, a R$ 3,00 — sem lançamento**

**20. Venda à vista de 150 refrigerantes consignados a R$ 6,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Mercadorias | 369,00 |
| D | ICMS a Recuperar | 81,00 |
| C | Fornecedores | 450,00 |
| D | Caixa | 900,00 |
| C | Receita Bruta de Vendas | 900,00 |
| D | ICMS sobre Vendas | 162,00 |
| C | ICMS a Recolher | 162,00 |
| D | PIS sobre Faturamento | 4,80 |
| C | PIS a Recolher | 4,80 |
| D | COFINS sobre Faturamento | 22,14 |
| C | COFINS a Recolher | 22,14 |
| D | Custo das Mercadorias Vendidas (CMV) | 379,70 |
| C | Estoque de Mercadorias | 379,70 |

**21. Devolução ao consignante de 150 refrigerantes — sem lançamento**

**22. Salários do mês: R$ 3.000,00, a pagar no mês seguinte**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesas com Salários | 3.000,00 |
| C | Salários a Pagar | 3.000,00 |

**23. Energia elétrica de R$ 600,00, paga pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa com Energia Elétrica | 600,00 |
| C | Bancos Conta Movimento | 600,00 |

**24. Compra a prazo (nota c3) de 400 embalagens a R$ 1,00, com IPI de 5% recuperável**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 328,00 |
| D | ICMS a Recuperar | 72,00 |
| D | IPI a Recuperar | 20,00 |
| C | Fornecedores | 420,00 |

**25. Produção de 300 hambúrgueres congelados**

| D/C | Conta | Valor |
|---|---|---|
| D | Produtos Acabados | 1.185,27 |
| C | Estoque de Insumos | 1.185,27 |

**26. Venda a prazo (nota v2) de 250 hambúrgueres congelados a R$ 12,00, com IPI de 5%**

| D/C | Conta | Valor |
|---|---|---|
| D | Clientes | 3.150,00 |
| C | Receita Bruta de Vendas | 3.000,00 |
| C | IPI a Recolher | 150,00 |
| D | ICMS sobre Vendas | 540,00 |
| C | ICMS a Recolher | 540,00 |
| D | PIS sobre Faturamento | 15,99 |
| C | PIS a Recolher | 15,99 |
| D | COFINS sobre Faturamento | 73,80 |
| C | COFINS a Recolher | 73,80 |
| D | Custo dos Produtos Vendidos (CPV) | 987,73 |
| C | Produtos Acabados | 987,73 |

**27. Depreciação do mês**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa de Depreciação | 133,33 |
| C | (−) Depreciação Acumulada — Edificações | 133,33 |
| D | Despesa de Depreciação | 50,00 |
| C | (−) Depreciação Acumulada — Móveis e Utensílios | 50,00 |
| D | Despesa de Depreciação | 200,00 |
| C | (−) Depreciação Acumulada — Equipamentos | 200,00 |

**28. Inventário do material de limpeza: restam 8 unidades**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa com Material de Consumo | 300,00 |
| C | Material de Consumo | 300,00 |

**29. Apuração do ICMS**

| D/C | Conta | Valor |
|---|---|---|
| D | ICMS a Recolher | 1.845,00 |
| C | ICMS a Recuperar | 1.845,00 |

**30. Apuração do IPI**

| D/C | Conta | Valor |
|---|---|---|
| D | IPI a Recolher | 20,00 |
| C | IPI a Recuperar | 20,00 |

## Estoque no fim do mês

| Item | Quantidade | Valor |
|---|---|---|
| Refrigerante | 220 | 556,90 |
| Pão | 500 | 338,57 |
| Carne | 600 | 1.878,55 |
| Queijo | 500 | 410,00 |
| Alface | 500 | 205,00 |
| Material de limpeza | 8 | 200,00 |
| Embalagem | 100 | 82,00 |
| Hambúrguer congelado | 50 | 197,54 |

## DRE do mês 1

| Linha | Valor |
|---|---|
| Receita Bruta de Vendas | 15.700,00 |
| (−) ICMS sobre Vendas | (2.723,76) |
| (−) PIS sobre Faturamento | (80,66) |
| (−) COFINS sobre Faturamento | (372,24) |
| (−) Devoluções de Vendas | (108,00) |
| (−) Abatimentos sobre Vendas | (100,00) |
| (−) Descontos Incondicionais Concedidos | (460,00) |
| **= Receita Líquida** | **11.855,34** |
| (−) CMV | (1.102,10) |
| (−) CPV | (3.594,34) |
| **= Lucro Bruto** | **7.158,90** |
| (−) Despesas com Salários | (3.000,00) |
| (−) Despesa com Energia Elétrica | (600,00) |
| (−) Despesa de Depreciação | (383,33) |
| (−) Despesa com Material de Consumo | (300,00) |
| (+) Descontos Financeiros Obtidos | 120,00 |
| (−) Descontos Financeiros Concedidos | (78,64) |
| **= Resultado do período (lucro)** | **2.916,93** |

## Balanço Patrimonial no dia 30

| Ativo | Valor | Passivo e PL | Valor |
|---|---|---|---|
| Caixa | 7.600,00 | Fornecedores | 2.670,00 |
| Bancos Conta Movimento | 17.813,36 | ICMS a Recolher | 878,76 |
| Clientes | 3.150,00 | PIS a Recolher | 80,66 |
| Estoque de Mercadorias | 556,90 | COFINS a Recolher | 372,24 |
| Estoque de Insumos | 2.914,12 | Salários a Pagar | 3.000,00 |
| Produtos Acabados | 197,54 | IPI a Recolher | 130,00 |
| Material de Consumo | 200,00 | **Passivo Circulante** | **7.131,66** |
| **Ativo Circulante** | **32.431,92** | Capital Social | 100.000,00 |
| Terrenos | 20.000,00 | Resultado do período | 2.916,93 |
| Edificações (líquido) | 39.866,67 | **Patrimônio Líquido** | **102.916,93** |
| Móveis e Utensílios (líquido) | 5.950,00 | | |
| Equipamentos (líquido) | 11.800,00 | | |
| **Ativo Não Circulante** | **77.616,67** | | |
| **Total do Ativo** | **110.048,59** | **Total do Passivo + PL** | **110.048,59** |

O balancete fecha em **123.334,99** de cada lado.
