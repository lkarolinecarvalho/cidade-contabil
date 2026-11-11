# Regras contábeis e tributárias — v1

**Fonte da verdade** do motor (`packages/ledger`). Cada regra tem um ID, que deve ser
citado no código e nos testes. Caso não coberto aqui = perguntar antes de implementar.

Regras marcadas com ⚠️ **VALIDAR** precisam de revisão técnica antes do lançamento
público (ver seção 13). Regras marcadas com 📘 **SIMPLIFICAÇÃO** são simplificações
didáticas deliberadas: o jogo deve mostrá-las ao jogador como "nota didática", para ele
não levar a simplificação para a prova.

## 1. Premissas gerais

- **R-GER-01** — Método das partidas dobradas: em todo lançamento, soma dos débitos =
  soma dos créditos.
- **R-GER-02** — Valores em centavos inteiros. Arredondamento meio para cima
  (ROUND_HALF_UP) em centavos, **por linha de tributo**, por linha de CMV e por linha
  de depreciação.
- **R-GER-03** — Regime de competência: receitas e despesas são reconhecidas quando
  ocorrem, independentemente de recebimento ou pagamento.
- **R-GER-04** — Um único estabelecimento, num único estado. Todas as operações são
  internas.

## 2. Entidade

- **R-ENT-01** — A carteira pessoal do avatar não é conta da empresa e não aparece no razão.
- **R-ENT-02** — Quando o avatar integraliza capital, a carteira pessoal diminui pela
  parte dele (fora do razão); a empresa registra a integralização (R-CAP-03).
- **R-ENT-03** — Despesa pessoal paga com recursos da empresa é bloqueada na v1.

## 3. Capital social (sociedade anônima)

- **R-CAP-01** — A empresa é uma S.A. Uma S.A. exige **pelo menos dois acionistas**
  (Lei 6.404/76, art. 80, I). No MVP, o avatar é o acionista controlador e o único
  jogável; um acionista NPC minoritário existe na narrativa (ADR-0007).
- **R-CAP-02** — **Capital autorizado** é o limite estatutário para aumentar o capital
  sem reforma do estatuto (art. 168). **Não gera lançamento.**
- **R-CAP-03** — Subscrição: D (−) Capital a Integralizar / C Capital Social Subscrito.
  Integralização: D Bancos|Caixa / C (−) Capital a Integralizar.
- **R-CAP-04** — No Balanço, o Capital Social é apresentado pelo valor subscrito menos o
  capital a integralizar (conta redutora do PL).
- **R-CAP-05** — A parcela de cada acionista é proporcional à sua participação; o motor
  registra a integralização total e a UI mostra a parte do avatar e a do NPC.

## 4. Plano de contas (v1)

| Código | Conta | Grupo | Natureza |
|---|---|---|---|
| 1.1.1 | Caixa | Ativo Circulante | Devedora |
| 1.1.2 | Bancos Conta Movimento | Ativo Circulante | Devedora |
| 1.1.3 | Clientes | Ativo Circulante | Devedora |
| 1.1.4 | Estoque de Mercadorias | Ativo Circulante | Devedora |
| 1.1.5 | ICMS a Recuperar | Ativo Circulante | Devedora |
| 1.2.3.1 | Terrenos | ANC — Imobilizado | Devedora |
| 1.2.3.2 | Edificações | ANC — Imobilizado | Devedora |
| 1.2.3.3 | Móveis e Utensílios | ANC — Imobilizado | Devedora |
| 1.2.3.4 | Equipamentos | ANC — Imobilizado | Devedora |
| 1.2.3.8 | (−) Depreciação Acumulada — Edificações | ANC — Imobilizado (redutora) | Credora |
| 1.2.3.9 | (−) Depreciação Acumulada — Móveis e Utensílios | ANC — Imobilizado (redutora) | Credora |
| 1.2.3.10 | (−) Depreciação Acumulada — Equipamentos | ANC — Imobilizado (redutora) | Credora |
| 2.1.1 | Fornecedores | Passivo Circulante | Credora |
| 2.1.2 | ICMS a Recolher | Passivo Circulante | Credora |
| 2.1.3 | PIS a Recolher | Passivo Circulante | Credora |
| 2.1.4 | COFINS a Recolher | Passivo Circulante | Credora |
| 2.1.5 | Salários a Pagar | Passivo Circulante | Credora |
| 2.3.1 | Capital Social Subscrito | Patrimônio Líquido | Credora |
| 2.3.2 | (−) Capital a Integralizar | Patrimônio Líquido (redutora) | Devedora |
| 2.3.3 | Lucros ou Prejuízos Acumulados | Patrimônio Líquido | Credora |
| 3.1.1 | Receita Bruta de Vendas | Resultado — Receita | Credora |
| 3.2.1 | ICMS sobre Vendas | Resultado — Dedução da receita | Devedora |
| 3.2.2 | PIS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 3.2.3 | COFINS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 4.1.1 | Custo das Mercadorias Vendidas (CMV) | Resultado — Custo | Devedora |
| 4.2.1 | Despesas com Salários | Resultado — Despesa operacional | Devedora |
| 4.2.2 | Despesa com Energia Elétrica | Resultado — Despesa operacional | Devedora |
| 4.2.3 | Despesa de Depreciação | Resultado — Despesa operacional | Devedora |

O plano de contas é dado (config), não código fixo, para poder crescer.

## 5. Classificação de ativos e imóveis

- **R-IMO-01** — Imóvel adquirido para **revenda** no curso normal das atividades →
  Estoque (CPC 16).
- **R-IMO-02** — Imóvel **usado pela própria empresa** → Imobilizado (CPC 27).
- **R-IMO-03** — Imóvel mantido para **aluguel ou valorização** → Propriedade para
  Investimento (CPC 28). Fora do MVP como operação; cobrado como afirmativa no capítulo 2.
- **R-IMO-04** — Terreno e edificação são registrados **separadamente**. O terreno, em
  regra, não é depreciado.
- **R-IMO-05** — Móveis, utensílios e equipamentos de uso próprio → Imobilizado.
- **R-IMO-06** — 📘 SIMPLIFICAÇÃO: na v1, aquisições de imobilizado não têm ICMS
  destacado (sem CIAP) e o valor de aquisição já inclui custos como ITBI e registro.

## 6. Estoque

- **R-EST-01** — Inventário **permanente**: cada entrada e saída atualiza quantidade e
  valor na hora.
- **R-EST-02** — Custo **médio ponderado móvel**, por produto. Após cada entrada:
  `custoMedio = (valorEmEstoque + valorEntrada) / (qtdEmEstoque + qtdEntrada)`.
  Guarde valor total e quantidade; o custo médio é derivado.
- **R-EST-03** — CMV de uma saída = `round(valorEmEstoque × qtdSaida / qtdEmEstoque)`.
  Quando a saída zera a quantidade, o CMV é o valor restante inteiro.
- **R-EST-04** — Venda acima da quantidade em estoque é bloqueada.

## 7. Compras de mercadorias

- **R-COM-01** — Custo de aquisição = valor dos produtos + IPI + frete cobrado na nota
  − ICMS recuperável.
- **R-COM-02** — Compra à vista: crédito em Caixa ou Bancos. Compra a prazo: crédito em
  Fornecedores pelo total da nota.
- **R-COM-03** — Lançamento típico:
  `D Estoque (custo) / D ICMS a Recuperar (ICMS) / C Fornecedores|Caixa|Bancos (total da nota)`.
- **R-COM-04** — Compra de mercadoria **não é despesa**: o custo vai ao resultado como
  CMV quando a mercadoria é vendida.

## 8. Tributos (Lucro Presumido)

Na campanha, os tributos sobre mercadorias entram a partir do **capítulo 4**. Os
capítulos 1–3 não têm operações com mercadorias.

### ICMS
- **R-ICMS-01** — Alíquota interna única configurável. Padrão: **18%**.
- **R-ICMS-02** — Cálculo **por dentro**: o ICMS está incluído no valor da operação.
- **R-ICMS-03** — Base do ICMS na compra = valor dos produtos + frete cobrado pelo
  remetente na nota. O IPI não integra a base quando a operação é entre contribuintes,
  com produto destinado à comercialização (CF, art. 155, §2º, XI). ⚠️ VALIDAR
- **R-ICMS-04** — Comerciante em regime normal **recupera** o ICMS das compras de
  mercadorias para revenda: D ICMS a Recuperar.
- **R-ICMS-05** — Na venda: D ICMS sobre Vendas / C ICMS a Recolher.
- **R-ICMS-06** — Apuração mensal (último dia do mês): compensa
  `min(ICMS a Recolher, ICMS a Recuperar)` com D ICMS a Recolher / C ICMS a Recuperar.
  Saldo devedor → pagar no Posto Fiscal. Saldo credor → permanece em ICMS a Recuperar.

### IPI
- **R-IPI-01** — Comerciante não recupera o IPI. O IPI integra o custo de aquisição.
- **R-IPI-02** — Alíquota de IPI vem na oferta do fornecedor (dado da missão).

### Frete
- **R-FRE-01** — Frete na compra cobrado na nota integra o custo de aquisição e a base
  do ICMS. Frete contratado à parte fica fora da v1.

### PIS e COFINS
- **R-PC-01** — Lucro Presumido → regime **cumulativo**: PIS 0,65% e COFINS 3,00%, sem
  crédito nas compras.
- **R-PC-02** — Base de cálculo = receita bruta da venda **menos o ICMS destacado**
  (STF, Tema 69). ⚠️ VALIDAR
- **R-PC-03** — Na venda: D PIS sobre Faturamento / C PIS a Recolher e
  D COFINS sobre Faturamento / C COFINS a Recolher.
- **R-PC-04** — O pagamento de PIS/COFINS fica fora da v1.

## 9. Vendas

- **R-VEN-01** — Venda à vista: D Caixa / C Receita Bruta de Vendas. A prazo:
  D Clientes / C Receita Bruta de Vendas.
- **R-VEN-02** — Toda venda gera, além da receita: ICMS, PIS/COFINS e CMV
  (D CMV / C Estoque).
- **R-VEN-03** — Recebimento de cliente: D Caixa|Bancos / C Clientes.

## 10. Despesas e obrigações

- **R-DES-01** — Despesa é reconhecida por competência. Reconhecer a despesa e pagar a
  obrigação são eventos diferentes.
- **R-DES-02** — Salários do mês: D Despesas com Salários / C Salários a Pagar.
  Pagamento: D Salários a Pagar / C Bancos|Caixa.
- **R-DES-03** — 📘 SIMPLIFICAÇÃO: encargos sobre a folha (INSS patronal, FGTS etc.) e
  retenções ficam fora do MVP.
- **R-DES-04** — Despesa paga na hora (ex.: energia): D Despesa / C Bancos|Caixa.
- **R-DES-05** — Pagamento a fornecedor (total ou parcial): D Fornecedores / C Bancos|Caixa.

## 11. Depreciação

- **R-DEP-01** — Método linear, sobre o custo, com vida útil estimada (CPC 27).
  Vidas úteis padrão (parâmetros): Edificações 25 anos, Móveis e Utensílios 10 anos,
  Equipamentos 5 anos. Terrenos não depreciam.
- **R-DEP-02** — 📘 SIMPLIFICAÇÃO: valor residual zero.
- **R-DEP-03** — 📘 SIMPLIFICAÇÃO: o bem deprecia **por mês completo** a partir do mês
  em que entra em uso.
- **R-DEP-04** — Lançamento mensal, por classe:
  D Despesa de Depreciação / C (−) Depreciação Acumulada — classe.
  Valor = `round(custo / vidaUtilAnos / 12)`.

## 12. Demonstrações

- **R-DEM-01** — Balancete: total devedor = total credor.
- **R-DEM-02** — DRE (v1):
  ```
  Receita Bruta de Vendas
  (−) Deduções: ICMS, PIS e COFINS sobre vendas
  = Receita Líquida
  (−) CMV
  = Lucro Bruto
  (−) Despesas operacionais (salários, energia, depreciação)
  = Resultado do período
  ```
- **R-DEM-03** — Balanço durante o exercício: o resultado ainda não encerrado aparece no
  PL como "Resultado do período", para manter Ativo = Passivo + PL. Ativo separado em
  Circulante e Não Circulante; imobilizado pelo líquido (custo − depreciação acumulada).
- **R-DEM-04** — Encerramento: as contas de resultado são zeradas contra Lucros ou
  Prejuízos Acumulados. Destinação do lucro fica fora da v1.

## 13. Pendências de validação técnica

1. **R-ICMS-03 e R-PC-02** — confirmar redação e vigência com a legislação atual.
2. **Reforma Tributária (EC 132/2023, LC 214/2025)** — a transição prevê a CBS no lugar
   do PIS/COFINS a partir de 2027, a redução do IPI e a substituição gradual do ICMS
   pelo IBS (2029–2032). A v1 ensina o modelo vigente antes da reforma. O motor de
   tributos deve ser parametrizado para receber depois um "modo pós-reforma" (ADR-0002).
3. **Vidas úteis (R-DEP-01)** — confirmar os valores padrão; são estimativas, não
   taxas fiscais obrigatórias.
