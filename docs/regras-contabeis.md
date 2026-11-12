# Regras contábeis e tributárias — v2

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

## 3. Capital social (sociedade limitada)

- **R-CAP-01** — A empresa é uma **sociedade limitada** com dois sócios: o avatar (90%
  das quotas), único jogável, e um sócio NPC investidor (10%), que só aparece na
  narrativa (ADR-0007). O capital é dividido em quotas, e todos os sócios respondem
  solidariamente pela integralização do capital (Código Civil, arts. 1.052 e 1.055).
- **R-CAP-02** — **Capital autorizado** é o limite estatutário para aumentar o capital
  sem reforma do estatuto (Lei 6.404/76, art. 168). **Não gera lançamento.** É figura
  da sociedade anônima: a empresa do jogo não tem capital autorizado, e o conceito é
  cobrado só na teoria, na comparação entre os tipos societários.
- **R-CAP-03** — Subscrição: D (−) Capital a Integralizar / C Capital Social Subscrito.
  Integralização: D Bancos|Caixa / C (−) Capital a Integralizar.
- **R-CAP-04** — No Balanço, o Capital Social é apresentado pelo valor subscrito menos o
  capital a integralizar (conta redutora do PL).
- **R-CAP-05** — A parcela de cada sócio é proporcional à sua participação; o motor
  registra a integralização total e a UI mostra a parte do avatar e a do NPC.

## 4. Plano de contas

| Código | Conta | Grupo | Natureza |
|---|---|---|---|
| 1.1.1 | Caixa | Ativo Circulante | Devedora |
| 1.1.2 | Bancos Conta Movimento | Ativo Circulante | Devedora |
| 1.1.3 | Clientes | Ativo Circulante | Devedora |
| 1.1.4 | Estoque de Mercadorias | Ativo Circulante | Devedora |
| 1.1.5 | ICMS a Recuperar | Ativo Circulante | Devedora |
| 1.1.6 | Estoque de Insumos | Ativo Circulante | Devedora |
| 1.1.7 | Produtos Acabados | Ativo Circulante | Devedora |
| 1.1.8 | Material de Consumo | Ativo Circulante | Devedora |
| 1.1.9 | IPI a Recuperar | Ativo Circulante | Devedora |
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
| 2.1.6 | IPI a Recolher | Passivo Circulante | Credora |
| 2.3.1 | Capital Social Subscrito | Patrimônio Líquido | Credora |
| 2.3.2 | (−) Capital a Integralizar | Patrimônio Líquido (redutora) | Devedora |
| 2.3.3 | Lucros ou Prejuízos Acumulados | Patrimônio Líquido | Credora |
| 3.1.1 | Receita Bruta de Vendas | Resultado — Receita | Credora |
| 3.2.1 | ICMS sobre Vendas | Resultado — Dedução da receita | Devedora |
| 3.2.2 | PIS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 3.2.3 | COFINS sobre Faturamento | Resultado — Dedução da receita | Devedora |
| 3.2.4 | Devoluções de Vendas | Resultado — Dedução da receita | Devedora |
| 3.2.5 | Abatimentos sobre Vendas | Resultado — Dedução da receita | Devedora |
| 3.2.6 | Descontos Incondicionais Concedidos | Resultado — Dedução da receita | Devedora |
| 3.3.1 | Descontos Financeiros Obtidos | Resultado — Receita financeira | Credora |
| 4.1.1 | Custo das Mercadorias Vendidas (CMV) | Resultado — Custo | Devedora |
| 4.1.2 | Custo dos Produtos Vendidos (CPV) | Resultado — Custo | Devedora |
| 4.2.1 | Despesas com Salários | Resultado — Despesa operacional | Devedora |
| 4.2.2 | Despesa com Energia Elétrica | Resultado — Despesa operacional | Devedora |
| 4.2.3 | Despesa de Depreciação | Resultado — Despesa operacional | Devedora |
| 4.2.4 | Despesa com Material de Consumo | Resultado — Despesa operacional | Devedora |
| 4.3.1 | Descontos Financeiros Concedidos | Resultado — Despesa financeira | Devedora |

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

Na campanha, os tributos entram a partir do **capítulo 4**. Nos capítulos 2 e 3, as
compras e vendas são feitas pelo valor total, sem tributos destacados (R-DID-01).

### ICMS
- **R-ICMS-01** — Alíquota interna única configurável. Padrão: **18%**.
- **R-ICMS-02** — Cálculo **por dentro**: o ICMS está incluído no valor da operação.
- **R-ICMS-03** — Base do ICMS na compra = valor dos produtos + frete cobrado pelo
  remetente na nota. O IPI **não** integra a base quando, ao mesmo tempo: a operação é
  entre contribuintes, o produto se destina à industrialização ou à comercialização e
  a operação é fato gerador dos dois impostos (CF, art. 155, §2º, XI; LC 87/96,
  art. 13, §2º). Faltando uma dessas condições, vale a R-ICMS-07. ⚠️ VALIDAR
- **R-ICMS-04** — Comerciante em regime normal **recupera** o ICMS das compras de
  mercadorias para revenda: D ICMS a Recuperar.
- **R-ICMS-05** — Na venda: D ICMS sobre Vendas / C ICMS a Recolher.
- **R-ICMS-06** — Apuração mensal (último dia do mês): compensa
  `min(ICMS a Recolher, ICMS a Recuperar)` com D ICMS a Recolher / C ICMS a Recuperar.
  Saldo devedor → pagar no Posto Fiscal. Saldo credor → permanece em ICMS a Recuperar.

### IPI
- **R-IPI-01** — Comerciante não recupera o IPI. O IPI integra o custo de aquisição.
- **R-IPI-02** — Alíquota de IPI vem na oferta do fornecedor (dado da missão). Só há
  IPI destacado quando quem emite a nota é estabelecimento industrial ou equiparado: a
  missão identifica o emitente (RIPI, arts. 8º, 9º e 24).

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
   **Seção 23 inteira** (R-DID-01, R-ICMS-07, R-ICMS-08 e R-ICMS-09) — redigida a
   partir da legislação citada, aguardando a validação da autora.
2. **Reforma Tributária (EC 132/2023, LC 214/2025)** — a transição prevê a CBS no lugar
   do PIS/COFINS a partir de 2027, a redução do IPI e a substituição gradual do ICMS
   pelo IBS (2029–2032). A v1 ensina o modelo vigente antes da reforma. O motor de
   tributos deve ser parametrizado para receber depois um "modo pós-reforma" (ADR-0002).
3. **Vidas úteis (R-DEP-01)** — confirmar os valores padrão; são estimativas, não
   taxas fiscais obrigatórias.

## 14. Regras faltantes (a escrever)

Casos que o jogo pode ter, mas que ainda não têm regra. Até a regra ser escrita aqui, o
motor recusa a operação (`caso_nao_coberto`).

1. Devolução de compra a prazo que já foi paga, e de venda a prazo que já foi recebida.
2. Abatimento sobre mercadoria que já saiu do estoque.
3. Venda direta de insumo ou de material de consumo.
4. Lotes em consignação do mesmo produto com preços diferentes.

## 15. Itens de estoque e a receita do lanche

A empresa do jogo é uma hamburgueria. O catálogo de itens é dado (config), como o
plano de contas.

- **R-INS-01** — O estoque tem seis itens, cada um com sua ficha e seu custo médio
  (R-EST-02): pão, carne, queijo e alface (**insumos**); refrigerante (**mercadoria
  para revenda**); material de limpeza (**material de consumo**). No arco da fábrica
  entram a embalagem (insumo) e o hambúrguer congelado (produto acabado).
- **R-INS-02** — Insumos e mercadorias ficam em contas separadas do Ativo Circulante:
  `Estoque de Insumos` e `Estoque de Mercadorias`. A compra de insumo segue as regras
  da compra de mercadoria (R-COM-01 a R-COM-04), inclusive o crédito de ICMS.
  Base: CPC 16 (R1), itens 6 e 9 a 11; LC 87/96, arts. 19 e 20.
- **R-INS-03** — 📘 SIMPLIFICAÇÃO: receita fixa. Cada hambúrguer vendido consome 1 pão,
  1 carne, 1 queijo e 1 porção de alface. Na venda, o motor baixa cada insumo pelo
  custo médio (R-EST-03) e leva a soma a `Custo dos Produtos Vendidos (CPV)`. Mão de
  obra, energia e demais gastos do preparo não entram no custo: são despesas do período.
- **R-INS-04** — Venda de hambúrguer é bloqueada se faltar qualquer insumo da receita.

O refrigerante vendido vai a `CMV`; o hambúrguer e o hambúrguer congelado vão a `CPV`.

## 16. Nota com mais de um item

- **R-NOT-01** — Cada item da nota é uma linha com quantidade e valor próprios. ICMS,
  IPI, PIS e COFINS são calculados por linha e arredondados por linha (R-GER-02).
- **R-NOT-02** — O frete cobrado na nota é rateado entre as linhas na proporção do
  valor dos produtos de cada uma. Cada parcela é arredondada meio para cima; a
  diferença de centavos vai para a linha de maior valor.
- **R-NOT-03** — O lançamento é um só: um débito por conta de estoque (somando os itens
  da mesma conta), um débito de ICMS a Recuperar pelo total e um crédito pelo total da
  nota.

## 17. Devoluções e abatimentos

Devoluções e abatimentos referem-se sempre a uma nota identificada.

- **R-DVC-01** — Devolução de compra. Sai do estoque pelo **custo com que aquela
  compra entrou** (não pelo custo médio do dia), estorna o ICMS a Recuperar (e o IPI a
  Recuperar, se houver) da parte devolvida e reduz Fornecedores. Se a compra foi à
  vista, o fornecedor devolve o dinheiro (débito em Caixa ou Bancos). Devolução de
  compra a prazo já paga fica fora desta versão.
  Base: CPC 16 (R1), item 11; LC 87/96, arts. 19 e 20.
- **R-ABC-01** — 📘 SIMPLIFICAÇÃO: abatimento sobre compras. Redução de preço concedida
  depois da nota, sem devolução. Reduz o custo do estoque e a dívida, sem mudar a
  quantidade. O abatimento não ajusta o ICMS da nota.
  `D Fornecedores / C Estoque`. Base: CPC 16 (R1), item 11.
- **R-DVV-01** — Devolução de venda. Só vale para o que volta ao estoque: o
  refrigerante e o hambúrguer congelado; lanche preparado não é devolvido. Registra
  `Devoluções de Vendas` (dedução da receita bruta) contra Clientes ou Caixa, estorna o
  ICMS, o PIS, a COFINS e o IPI da parte devolvida e devolve a mercadoria ao estoque
  pelo **custo com que saiu**, estornando o CMV ou o CPV.
  Base: Lei 6.404/76, art. 187, I; DL 1.598/77, art. 12, §1º, I; Lei 9.718/98, art. 3º,
  §2º, I.
- **R-ABV-01** — 📘 SIMPLIFICAÇÃO: abatimento sobre vendas. Redução de preço concedida
  depois da venda, sem devolução. É dedução da receita bruta e não ajusta tributos nem
  estoque. `D Abatimentos sobre Vendas / C Clientes|Caixa`.
  Base: Lei 6.404/76, art. 187, I.

## 18. Descontos

- **R-DSC-01** — Desconto comercial (incondicional) na compra. Vem na própria nota e
  não é registrado: a compra entra pelo valor líquido, e o ICMS incide sobre o líquido.
  Base: CPC 16 (R1), item 11; LC 87/96, art. 13, §1º, II, "a".
- **R-DSC-02** — 📘 SIMPLIFICAÇÃO: desconto financeiro obtido, por pagar o fornecedor
  antes do vencimento. É receita financeira e não altera o custo do estoque.
  `D Fornecedores / C Bancos|Caixa / C Descontos Financeiros Obtidos`.
  Base: Lei 6.404/76, art. 187, III.
- **R-DSC-03** — Desconto incondicional concedido. Vem na nota de venda. A receita
  bruta é registrada cheia e o desconto aparece como dedução; ICMS, PIS e COFINS
  incidem sobre o valor líquido.
  `D Clientes|Caixa (líquido) / D Descontos Incondicionais Concedidos / C Receita Bruta`.
  Base: DL 1.598/77, art. 12, §1º, II; LC 87/96, art. 13, §1º, II, "a"; Lei 9.718/98,
  art. 3º, §2º, I.
- **R-DSC-04** — 📘 SIMPLIFICAÇÃO: desconto financeiro concedido, por receber do
  cliente antes do vencimento. É despesa financeira.
  `D Bancos|Caixa / D Descontos Financeiros Concedidos / C Clientes`.
  Base: Lei 6.404/76, art. 187, III.

## 19. Consignação

A hamburgueria é a consignatária: recebe a mercadoria e só paga o que vender.

- **R-CSG-01** — Mercadoria recebida em consignação não é ativo da empresa, que não
  tem o controle dela. Não há lançamento; a quantidade fica num controle à parte.
  Base: CPC 47, itens B77 e B78; CPC 00 (R2), definição de ativo.
- **R-CSG-02** — Na venda de um item consignado, a empresa registra, na mesma data, a
  compra a prazo das unidades vendidas (R-COM-03) e a venda normal, com CMV.
- **R-CSG-03** — A devolução ao consignante das unidades não vendidas não gera
  lançamento.
- **R-CSG-04** — 📘 SIMPLIFICAÇÃO: o ICMS só aparece na compra efetiva e na venda. Na
  vida real, a remessa em consignação já tem nota com imposto destacado.

O registro da consignação em contas de compensação é cobrado só como teoria.

## 20. Material de consumo

- **R-MCO-01** — Material de limpeza comprado entra em `Material de Consumo` (Ativo
  Circulante) pelo valor total da nota: não há crédito de ICMS em material de uso e
  consumo. Base: LC 87/96, art. 33, I (redação da LC 171/2019).
- **R-MCO-02** — No último dia do mês, o inventário informa a quantidade que sobrou. O
  que saiu é o consumo, baixado pelo custo médio:
  `D Despesa com Material de Consumo / C Material de Consumo`.

## 21. IPI na fábrica e produção

A regra geral da revenda continua sendo a R-IPI-01 (o IPI integra o custo).

- **R-IPI-03** — A hamburgueria em si não é contribuinte do IPI: o preparo de alimentos
  em lanchonete, para venda direta ao consumidor, não é industrialização. A venda de
  lanche preparado nunca tem IPI. Base: RIPI (Decreto 7.212/2010), art. 5º, I.
- **R-IPI-04** — Nas compras para a fábrica de hambúrguer congelado, o IPI é
  recuperável: `D Estoque / D ICMS a Recuperar / D IPI a Recuperar / C Fornecedores`.
  Só a embalagem do congelado é comprada com IPI recuperável.
  Base: RIPI, arts. 4º e 226.
- **R-IPI-05** — Na venda do congelado, o IPI é cobrado por fora e não é receita:
  `D Clientes (total da nota) / C Receita Bruta (produtos) / C IPI a Recolher (IPI)`.
  ICMS, PIS e COFINS incidem sobre o valor dos produtos.
  Base: RIPI, art. 190; CPC 47, item 47.
- **R-IPI-06** — Apuração mensal do IPI, igual à do ICMS (R-ICMS-06):
  `D IPI a Recolher / C IPI a Recuperar` pelo menor dos dois saldos. O saldo devedor é
  pago; o saldo credor permanece em IPI a Recuperar.
- **R-IPI-07** — 📘 SIMPLIFICAÇÃO: as alíquotas de IPI são didáticas e vêm na operação
  (R-IPI-02). Na TIPI, preparações de carne bovina têm alíquota zero.
- **R-PRD-01** — 📘 SIMPLIFICAÇÃO: receita do congelado. Cada unidade consome 1 carne e
  1 embalagem. A operação "produzir" transfere o custo dos insumos para `Produtos
  Acabados`; a venda baixa `Produtos Acabados` contra CPV. Mão de obra e gastos gerais
  de fabricação não entram no custo.

## 22. Regime tributário

O Lucro Presumido é mantido como simplificação didática, para o jogador treinar ICMS,
PIS e COFINS destacados. Uma hamburgueria desse porte estaria, na vida real, no Simples
Nacional.

## 23. Progressão didática e situações tributárias

⚠️ **VALIDAR** — seção redigida a partir da legislação citada, pendente de validação.

- **R-DID-01** — 📘 SIMPLIFICAÇÃO: fase sem tributos. Nos capítulos 2 e 3 da campanha,
  as compras e vendas são registradas pelo valor total da nota, sem destaque de ICMS,
  IPI, PIS e COFINS, para o jogador aprender primeiro a movimentação patrimonial. A
  compra entra no estoque pelo total: `D Estoque / C Caixa|Bancos|Fornecedores`. A
  venda reconhece só a receita e o custo:
  `D Caixa|Clientes / C Receita Bruta` e `D CMV|CPV / C Estoque`. A operação declara
  `semTributos`; uma nota assim não pode ter IPI. Os tributos entram no capítulo 4.
- **R-ICMS-07** — IPI na base do ICMS. Quando falta alguma das condições da R-ICMS-03,
  o IPI integra a base de cálculo do ICMS. No jogo, é o caso do **material de uso e
  consumo** comprado de um estabelecimento industrial: o produto não se destina à
  industrialização nem à comercialização, e a base é
  `valor dos produtos + frete + IPI`. Como também não há crédito (R-MCO-01), o ICMS
  destacado é só informativo e a nota inteira vai ao custo.
  Base: CF, art. 155, §2º, XI; LC 87/96, art. 13, §1º e §2º.
- **R-ICMS-08** — Requisitos do crédito de ICMS (detalha a R-ICMS-04). Há crédito
  quando, ao mesmo tempo: (a) a empresa é contribuinte do ICMS no regime normal de
  apuração; (b) a mercadoria entra para revenda ou como insumo de um produto cuja saída
  é tributada; (c) o imposto vem destacado em documento fiscal idôneo. Não há crédito
  na entrada de material de uso e consumo (R-MCO-01) nem quando a saída seguinte é
  isenta ou não tributada. Base: CF, art. 155, §2º, I e II; LC 87/96, arts. 19, 20
  (caput e §§ 1º e 3º), 23 e 33, I.
- **R-ICMS-09** — 📘 SIMPLIFICAÇÃO: sem substituição tributária nem regimes especiais.
  Todos os itens do jogo seguem o regime normal de débito e crédito, com a alíquota
  única da R-ICMS-01. Na vida real, refrigerantes costumam estar sujeitos à
  substituição tributária (o comerciante não se credita nem se debita), e bares,
  restaurantes e lanchonetes muitas vezes optam por regimes especiais, calculados sobre
  a receita e sem direito a crédito.

### As cinco situações da campanha

| Situação | Operação | Quem vende | Finalidade | IPI na base do ICMS? | ICMS | IPI |
|---|---|---|---|---|---|---|
| A | Material de limpeza | Indústria | Uso e consumo | Sim (R-ICMS-07) | Não recuperável (R-MCO-01) | Não recuperável (R-IPI-01) |
| B | Refrigerante | Indústria | Revenda | Não (R-ICMS-03) | Recuperável | Não recuperável: custo (R-IPI-01) |
| C | Pão, carne, queijo e alface | Atacadista | Insumo do lanche | Não há IPI | Recuperável (R-ICMS-08) | — |
| D | Embalagem do congelado | Indústria | Industrialização | Não (R-ICMS-03) | Recuperável | Recuperável (R-IPI-04) |
| E | Material de limpeza e IPI do refrigerante | — | — | — | Vão ao custo de aquisição (R-COM-01; CPC 16 (R1), item 11) | |
