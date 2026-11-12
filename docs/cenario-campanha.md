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
- **Capítulos 2 e 3 sem tributos destacados** (R-DID-01): compras e vendas pelo valor
  total. A partir do capítulo 4: ICMS de 18% por dentro; PIS de 0,65% e COFINS de 3%
  sobre a receita sem o ICMS.
- O IPI fica fora da base do ICMS na compra para revenda ou industrialização
  (R-ICMS-03) e entra na base na compra para uso e consumo (R-ICMS-07).
- Catálogo da hamburgueria (R-INS-01). Cada hambúrguer consome 1 pão, 1 carne, 1 queijo
  e 1 alface (R-INS-03); cada hambúrguer congelado, 1 carne e 1 embalagem (R-PRD-01).
- Vida útil: edificações 25 anos, móveis e utensílios 10, equipamentos 5 (R-DEP-01).
- As operações 33 a 36 são do último dia do mês (dia 30).
- As conversas com a Marta (missões sem operação) não aparecem aqui: não geram
  lançamento.

## Operações e lançamentos

### Capítulo 1 — Abrindo as portas

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

### Capítulo 2 — Primeira semana (sem tributos destacados)

**7. Compra à vista (banco) de 500 refrigerantes a R$ 3,00, sem tributos destacados**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Mercadorias | 1.500,00 |
| C | Bancos Conta Movimento | 1.500,00 |

**8. Compra a prazo (nota c1), sem tributos destacados: 1.000 pães a R$ 1,00, 1.000 carnes a R$ 4,00, 1.000 queijos a R$ 1,00 e 1.000 alfaces a R$ 0,50**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 6.500,00 |
| C | Fornecedores | 6.500,00 |

**9. Pagamento da nota c1 (R$ 6.500,00), pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 6.500,00 |
| C | Bancos Conta Movimento | 6.500,00 |

**10. Inauguração: venda à vista de 300 hambúrgueres a R$ 20,00 e 200 refrigerantes a R$ 6,00, sem tributos destacados**

| D/C | Conta | Valor |
|---|---|---|
| D | Caixa | 7.200,00 |
| C | Receita Bruta de Vendas | 7.200,00 |
| D | Custo das Mercadorias Vendidas (CMV) | 600,00 |
| C | Estoque de Mercadorias | 600,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.950,00 |
| C | Estoque de Insumos | 1.950,00 |

### Capítulo 3 — A casa funcionando (sem tributos destacados)

**11. Venda a prazo de 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00, sem tributos destacados**

| D/C | Conta | Valor |
|---|---|---|
| D | Clientes | 4.600,00 |
| C | Receita Bruta de Vendas | 4.600,00 |
| D | Custo das Mercadorias Vendidas (CMV) | 300,00 |
| C | Estoque de Mercadorias | 300,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.300,00 |
| C | Estoque de Insumos | 1.300,00 |

**12. Recebimento do cliente (R$ 4.600,00), pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Bancos Conta Movimento | 4.600,00 |
| C | Clientes | 4.600,00 |

**13. Salários do mês: R$ 3.000,00, a pagar no mês seguinte**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesas com Salários | 3.000,00 |
| C | Salários a Pagar | 3.000,00 |

**14. Energia elétrica de R$ 600,00, paga pelo banco**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa com Energia Elétrica | 600,00 |
| C | Bancos Conta Movimento | 600,00 |

### Capítulo 4 — Os impostos entram em cena

**15. Situação C — compra a prazo (nota c2) de insumos, de atacadista, com ICMS recuperável: 500 pães a R$ 1,00, 500 carnes a R$ 4,00, 500 queijos a R$ 1,00 e 500 alfaces a R$ 0,50**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 2.665,00 |
| D | ICMS a Recuperar | 585,00 |
| C | Fornecedores | 3.250,00 |

**16. Situação B — compra à vista (banco), da fábrica, de 500 refrigerantes a R$ 3,00 para revenda, com IPI de 4% fora da base do ICMS**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Mercadorias | 1.290,00 |
| D | ICMS a Recuperar | 270,00 |
| C | Bancos Conta Movimento | 1.560,00 |

**17. Situações A e E — compra à vista (caixa), da fábrica, de 20 unidades de material de limpeza a R$ 25,00 para uso e consumo, com IPI de 5% na base do ICMS e nenhum tributo recuperável**

| D/C | Conta | Valor |
|---|---|---|
| D | Material de Consumo | 525,00 |
| C | Caixa | 525,00 |

Na nota: base do ICMS de R$ 525,00 (produtos + IPI) e ICMS destacado de R$ 94,50, só informativo: não há crédito.

**18. Venda à vista, com tributos, de 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Caixa | 4.600,00 |
| C | Receita Bruta de Vendas | 4.600,00 |
| D | ICMS sobre Vendas | 828,00 |
| C | ICMS a Recolher | 828,00 |
| D | PIS sobre Faturamento | 24,52 |
| C | PIS a Recolher | 24,52 |
| D | COFINS sobre Faturamento | 113,16 |
| C | COFINS a Recolher | 113,16 |
| D | Custo das Mercadorias Vendidas (CMV) | 270,00 |
| C | Estoque de Mercadorias | 270,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.183,00 |
| C | Estoque de Insumos | 1.183,00 |

### Capítulo 5 — Problemas de todo dia

**19. Devolução de 100 carnes da nota c2**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 400,00 |
| C | Estoque de Insumos | 328,00 |
| C | ICMS a Recuperar | 72,00 |

**20. Abatimento de R$ 50,00 sobre o pão da nota c2**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 50,00 |
| C | Estoque de Insumos | 50,00 |

**21. Compra a prazo (nota c3) de 500 carnes a R$ 4,00, com 10% de desconto na nota**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 1.476,00 |
| D | ICMS a Recuperar | 324,00 |
| C | Fornecedores | 1.800,00 |

**22. Pagamento antecipado da nota c2 (R$ 2.800,00), pelo banco, com desconto de R$ 56,00**

| D/C | Conta | Valor |
|---|---|---|
| D | Fornecedores | 2.800,00 |
| C | Bancos Conta Movimento | 2.744,00 |
| C | Descontos Financeiros Obtidos | 56,00 |

**23. Encomenda a prazo (nota v1): 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00, com 10% de desconto na nota**

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
| D | Custo das Mercadorias Vendidas (CMV) | 270,00 |
| C | Estoque de Mercadorias | 270,00 |
| D | Custo dos Produtos Vendidos (CPV) | 1.119,17 |
| C | Estoque de Insumos | 1.119,17 |

**24. Devolução de 20 refrigerantes da nota v1**

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
| D | Estoque de Mercadorias | 54,00 |
| C | Custo das Mercadorias Vendidas (CMV) | 54,00 |

**25. Abatimento de R$ 100,00 sobre a encomenda**

| D/C | Conta | Valor |
|---|---|---|
| D | Abatimentos sobre Vendas | 100,00 |
| C | Clientes | 100,00 |

**26. Recebimento antecipado da nota v1 (R$ 3.932,00), pelo banco, com desconto de R$ 78,64**

| D/C | Conta | Valor |
|---|---|---|
| D | Bancos Conta Movimento | 3.853,36 |
| D | Descontos Financeiros Concedidos | 78,64 |
| C | Clientes | 3.932,00 |

### Capítulo 6 — A geladeira da marca

**27. Recebimento de 300 refrigerantes em consignação, a R$ 3,00 — sem lançamento**

**28. Venda à vista de 150 refrigerantes consignados a R$ 6,00**

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
| D | Custo das Mercadorias Vendidas (CMV) | 396,94 |
| C | Estoque de Mercadorias | 396,94 |

**29. Devolução ao consignante de 150 refrigerantes — sem lançamento**

### Capítulo 7 — A fábrica

**30. Situação D — compra a prazo (nota c4), da fábrica, de 400 embalagens a R$ 1,00 para industrialização, com IPI de 5% recuperável**

| D/C | Conta | Valor |
|---|---|---|
| D | Estoque de Insumos | 328,00 |
| D | ICMS a Recuperar | 72,00 |
| D | IPI a Recuperar | 20,00 |
| C | Fornecedores | 420,00 |

**31. Produção de 300 hambúrgueres congelados**

| D/C | Conta | Valor |
|---|---|---|
| D | Produtos Acabados | 1.261,00 |
| C | Estoque de Insumos | 1.261,00 |

**32. Venda a prazo (nota v2), para o mercado, de 250 hambúrgueres congelados a R$ 12,00, com IPI de 5% por fora**

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
| D | Custo dos Produtos Vendidos (CPV) | 1.050,83 |
| C | Produtos Acabados | 1.050,83 |

### Capítulo 8 — Fechando o mês (dia 30)

**33. Depreciação do mês**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa de Depreciação | 133,33 |
| C | (−) Depreciação Acumulada — Edificações | 133,33 |
| D | Despesa de Depreciação | 50,00 |
| C | (−) Depreciação Acumulada — Móveis e Utensílios | 50,00 |
| D | Despesa de Depreciação | 200,00 |
| C | (−) Depreciação Acumulada — Equipamentos | 200,00 |

**34. Inventário do material de limpeza: restam 8 unidades**

| D/C | Conta | Valor |
|---|---|---|
| D | Despesa com Material de Consumo | 315,00 |
| C | Material de Consumo | 315,00 |

**35. Apuração do ICMS**

| D/C | Conta | Valor |
|---|---|---|
| D | ICMS a Recolher | 1.260,00 |
| C | ICMS a Recuperar | 1.260,00 |

**36. Apuração do IPI**

| D/C | Conta | Valor |
|---|---|---|
| D | IPI a Recolher | 20,00 |
| C | IPI a Recuperar | 20,00 |

## Estoque no fim do mês

| Item | Quantidade | Valor |
|---|---|---|
| Refrigerante | 520 | 1.376,06 |
| Pão | 600 | 508,50 |
| Carne | 700 | 2.368,33 |
| Queijo | 600 | 546,00 |
| Alface | 600 | 273,00 |
| Material de limpeza | 8 | 210,00 |
| Embalagem | 100 | 82,00 |
| Hambúrguer congelado | 50 | 210,17 |

## DRE do mês 1

| Linha | Valor |
|---|---|
| Receita Bruta de Vendas | 24.900,00 |
| (−) ICMS sobre Vendas | (2.255,76) |
| (−) PIS sobre Faturamento | (66,80) |
| (−) COFINS sobre Faturamento | (308,28) |
| (−) Devoluções de Vendas | (108,00) |
| (−) Abatimentos sobre Vendas | (100,00) |
| (−) Descontos Incondicionais Concedidos | (460,00) |
| **= Receita Líquida** | **21.601,16** |
| (−) Custo das Mercadorias Vendidas (CMV) | (1.782,94) |
| (−) Custo dos Produtos Vendidos (CPV) | (6.603,00) |
| **= Lucro Bruto** | **13.215,22** |
| (−) Despesas com Salários | (3.000,00) |
| (−) Despesa com Energia Elétrica | (600,00) |
| (−) Despesa de Depreciação | (383,33) |
| (−) Despesa com Material de Consumo | (315,00) |
| (+) Descontos Financeiros Obtidos | 56,00 |
| (−) Descontos Financeiros Concedidos | (78,64) |
| **= Resultado do período (lucro)** | **8.894,25** |

## Balanço Patrimonial no dia 30

| Ativo | Valor | Passivo e PL | Valor |
|---|---|---|---|
| Caixa | 12.175,00 | Fornecedores | 2.670,00 |
| Bancos Conta Movimento | 17.549,36 | ICMS a Recolher | 995,76 |
| Clientes | 3.150,00 | PIS a Recolher | 66,80 |
| Estoque de Mercadorias | 1.376,06 | COFINS a Recolher | 308,28 |
| Estoque de Insumos | 3.777,83 | Salários a Pagar | 3.000,00 |
| Produtos Acabados | 210,17 | IPI a Recolher | 130,00 |
| Material de Consumo | 210,00 | **Passivo Circulante** | **7.170,84** |
| **Ativo Circulante** | **38.448,42** | Capital Social | 100.000,00 |
| Terrenos | 20.000,00 | Resultado do período | 8.894,25 |
| Edificações (líquido) | 39.866,67 | **Patrimônio Líquido** | **108.894,25** |
| Móveis e Utensílios (líquido) | 5.950,00 |  |  |
| Equipamentos (líquido) | 11.800,00 |  |  |
| **Ativo Não Circulante** | **77.616,67** |  |  |
| **Total do Ativo** | **116.065,09** | **Total do Passivo + PL** | **116.065,09** |

O balancete fecha em **132.510,17** de cada lado.
