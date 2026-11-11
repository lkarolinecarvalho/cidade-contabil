# Regras contábeis e tributárias — v1

**Fonte da verdade** do motor (`packages/ledger`). Cada regra tem um ID, que deve ser
citado no código e nos testes. Caso não coberto aqui = perguntar antes de implementar.

Regras marcadas com ⚠️ **VALIDAR** precisam de revisão técnica antes do lançamento
público (ver seção 9).

## 1. Premissas gerais

- **R-GER-01** — Método das partidas dobradas: em todo lançamento, soma dos débitos =
  soma dos créditos.
- **R-GER-02** — Valores em centavos inteiros. Arredondamento meio para cima
  (ROUND_HALF_UP) em centavos, **por linha de tributo** e por linha de CMV.
- **R-GER-03** — Regime de competência: receita reconhecida na venda (entrega),
  independentemente do recebimento.
- **R-GER-04** — Um único estabelecimento, num único estado. Todas as operações são
  internas.

## 2. Entidade

- **R-ENT-01** — A carteira pessoal do avatar não é conta da empresa e não aparece no razão.
- **R-ENT-02** — Integralização de capital em dinheiro: D Caixa / C Capital Social. A
  carteira pessoal diminui no mesmo valor (fora do razão).
- **R-ENT-03** — Despesa pessoal paga com recursos da empresa é bloqueada na v1.

## 3. Plano de contas (v1)

| Código | Conta | Grupo | Natureza |
|---|---|---|---|
| 1.1.1 | Caixa | Ativo Circulante | Devedora |
| 1.1.2 | Bancos Conta Movimento | Ativo Circulante | Devedora |
| 1.1.3 | Clientes | Ativo Circulante | Devedora |
| 1.1.4 | Estoque de Mercadorias | Ativo Circulante | Devedora |
| 1.1.5 | ICMS a Recuperar | Ativo Circulante | Devedora |
| 2.1.1 | Fornecedores | Passivo Circulante | Credora |
| 2.1.2 | ICMS a Recolher | Passivo Circulante | Credora |
| 2.1.3 | PIS a Recolher | Passivo Circulante | Credora |
| 2.1.4 | COFINS a Recolher | Passivo Circulante | Credora |
| 2.3.1 | Capital Social | Patrimônio Líquido | Credora |
| 2.3.2 | Lucros ou Prejuízos Acumulados | Patrimônio Líquido | Credora |
| 3.1.1 | Receita Bruta de Vendas | Resultado — Receita | Credora |
| 3.2.1 | ICMS sobre Vendas | Resultado — Dedução da receita | Devedora |
| 3.2.2 | PIS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 3.2.3 | COFINS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 4.1.1 | Custo das Mercadorias Vendidas (CMV) | Resultado — Custo | Devedora |

O plano de contas é dado (config), não código fixo, para poder crescer.

## 4. Estoque

- **R-EST-01** — Inventário **permanente**: cada entrada e saída atualiza quantidade e
  valor na hora.
- **R-EST-02** — Custo **médio ponderado móvel**, por produto. Após cada entrada:
  `custoMedio = (valorEmEstoque + valorEntrada) / (qtdEmEstoque + qtdEntrada)`.
  Guarde valor total e quantidade; o custo médio é derivado (não armazene o médio
  arredondado).
- **R-EST-03** — CMV de uma saída = `round(valorEmEstoque × qtdSaida / qtdEmEstoque)`.
  Quando a saída zera a quantidade, o CMV é o valor restante inteiro (absorve resíduo
  de arredondamento).
- **R-EST-04** — Venda acima da quantidade em estoque é bloqueada.

## 5. Compras

- **R-COM-01** — Custo de aquisição = valor dos produtos + IPI + frete cobrado na nota
  − ICMS recuperável.
- **R-COM-02** — Compra à vista: crédito em Caixa ou Bancos (o jogador escolhe a forma
  de pagamento). Compra a prazo: crédito em Fornecedores pelo total da nota.
- **R-COM-03** — Lançamento típico:
  `D Estoque (custo) / D ICMS a Recuperar (ICMS) / C Fornecedores|Caixa|Bancos (total da nota)`.

## 6. Tributos (Lucro Presumido)

### ICMS
- **R-ICMS-01** — Alíquota interna única configurável. Padrão: **18%**.
- **R-ICMS-02** — Cálculo **por dentro**: o ICMS está incluído no valor da operação.
  Na nota, o ICMS destacado é `base × alíquota`, e o total da nota não soma o ICMS
  outra vez.
- **R-ICMS-03** — Base do ICMS na compra = valor dos produtos + frete cobrado pelo
  remetente na nota. **O IPI não integra a base** quando a operação é entre
  contribuintes, com produto destinado à comercialização (CF, art. 155, §2º, XI). ⚠️ VALIDAR
- **R-ICMS-04** — Comerciante em regime normal **recupera** o ICMS das compras de
  mercadorias para revenda (não cumulatividade): D ICMS a Recuperar.
- **R-ICMS-05** — Na venda: D ICMS sobre Vendas / C ICMS a Recolher, sobre o valor da venda.
- **R-ICMS-06** — Apuração mensal (último dia do mês):
  compensa `min(ICMS a Recolher, ICMS a Recuperar)` com
  D ICMS a Recolher / C ICMS a Recuperar.
  Saldo devedor → pagar no Posto Fiscal (D ICMS a Recolher / C Caixa|Bancos).
  Saldo credor → permanece em ICMS a Recuperar para o mês seguinte.

### IPI
- **R-IPI-01** — Comerciante (não contribuinte do IPI) **não recupera** o IPI. O IPI
  integra o custo de aquisição.
- **R-IPI-02** — Alíquota de IPI vem na oferta do fornecedor (dado da missão).

### Frete
- **R-FRE-01** — Frete na compra cobrado na nota do fornecedor integra o custo de
  aquisição e a base do ICMS (R-ICMS-03). Frete contratado à parte fica fora da v1.

### PIS e COFINS
- **R-PC-01** — Lucro Presumido → regime **cumulativo**. Alíquotas: PIS 0,65% e
  COFINS 3,00%. Sem crédito nas compras (o que vier embutido no preço integra o custo).
- **R-PC-02** — Base de cálculo = receita bruta da venda **menos o ICMS destacado**
  (STF, Tema 69). ⚠️ VALIDAR
- **R-PC-03** — Na venda: D PIS sobre Faturamento / C PIS a Recolher e
  D COFINS sobre Faturamento / C COFINS a Recolher.
- **R-PC-04** — O pagamento de PIS/COFINS fica fora da v1 (o saldo a recolher aparece
  no balanço).

## 7. Vendas

- **R-VEN-01** — Venda à vista: D Caixa / C Receita Bruta de Vendas. A prazo:
  D Clientes / C Receita Bruta de Vendas.
- **R-VEN-02** — Toda venda gera, além da receita: ICMS (R-ICMS-05), PIS/COFINS
  (R-PC-03) e CMV (D CMV / C Estoque, R-EST-03).
- **R-VEN-03** — Recebimento de cliente: D Caixa|Bancos / C Clientes.

## 8. Demonstrações

- **R-DEM-01** — Balancete: saldos de todas as contas; total devedor = total credor.
- **R-DEM-02** — DRE (v1):
  ```
  Receita Bruta de Vendas
  (−) Deduções: ICMS, PIS e COFINS sobre vendas
  = Receita Líquida
  (−) CMV
  = Lucro Bruto
  = Resultado do período   (sem despesas operacionais na v1)
  ```
- **R-DEM-03** — Balanço Patrimonial durante o mês: o resultado ainda não encerrado
  aparece no PL como "Resultado do período", para manter Ativo = Passivo + PL.
- **R-DEM-04** — Encerramento no fim do mês: as contas de resultado são zeradas contra
  Lucros ou Prejuízos Acumulados. (Destinação do lucro fica fora da v1.)

## 9. Pendências de validação técnica

1. **R-ICMS-03 e R-PC-02** — confirmar a redação e a vigência com a legislação atual.
2. **Reforma Tributária (EC 132/2023, LC 214/2025)** — a transição prevê a CBS no lugar
   do PIS/COFINS a partir de 2027, a redução do IPI e a substituição gradual do ICMS
   pelo IBS (2029–2032). A v1 ensina o **modelo vigente antes da reforma**, que ainda é
   o cobrado em boa parte dos editais. O motor de tributos deve ser parametrizado
   (tributos e alíquotas em config) para receber depois um "modo pós-reforma". Ver ADR-0002.
