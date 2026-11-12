# Regras contábeis e tributárias — v2 (rascunho para validação)

> **Status: rascunho. Nada daqui vale para o motor ainda.**
> A fonte da verdade continua sendo `docs/regras-contabeis.md`. Cada regra abaixo só
> entra lá, e só é implementada, depois de validada. Os IDs são provisórios.

Como ler:

- **Base** é a norma em que a regra se apoia.
- 📘 marca simplificação didática: o jogo mostra a "nota didática" ao jogador.
- ❓ marca um ponto em que há mais de um tratamento possível e a decisão é sua.
- Os exemplos usam ICMS de 18% por dentro, PIS de 0,65% e COFINS de 3% (parâmetros
  atuais do jogo). Os valores são só ilustrativos; o cenário dourado vem depois.

Sobre as fontes: confirmei em busca na internet a LC 87/96, art. 33, I (redação da LC
171/2019), o RIPI, art. 5º, I, o DL 1.598/77, art. 12, e o Código Civil, arts. 1.052 e
1.055. As citações do CPC 16, do CPC 47 e do RIPI, art. 226, vêm do meu conhecimento
das normas; não consegui abrir o texto oficial nesta rodada. Vale conferir os números
dos itens.

---

## A. Tipo societário

A empresa deixa de ser S.A. e passa a ser **sociedade limitada**. O capital autorizado
e as demais particularidades da S.A. saem das operações e ficam só na teoria do
Escritório (comparação entre os tipos societários).

- **R-SOC-01** — A empresa é uma sociedade limitada com dois sócios: o avatar (90% das
  quotas) e o Sr. Osvaldo (10%). O capital é dividido em quotas, e todos os sócios
  respondem solidariamente pela integralização do capital.
  Base: Código Civil, arts. 1.052 e 1.055.
- **R-SOC-02** — Subscrição e integralização seguem como hoje (R-CAP-03 e R-CAP-04):
  `D (−) Capital a Integralizar / C Capital Social` na subscrição;
  `D Bancos|Caixa / C (−) Capital a Integralizar` na integralização.
- **R-SOC-03** — Saem das operações: R-CAP-01 (exigência de dois acionistas) e
  R-CAP-02 (capital autorizado). Viram conteúdo de teoria.

❓ **Regime tributário.** Uma hamburgueria desse porte estaria, na vida real, no Simples
Nacional. Proponho manter o **Lucro Presumido** como 📘, para o jogador treinar ICMS,
PIS e COFINS destacados. Confirma?

---

## B. Itens de estoque e a receita do lanche

- **R-INS-01** — O estoque tem seis itens, cada um com sua ficha e seu custo médio
  (R-EST-02): pão, carne, queijo e alface (**insumos**); refrigerante (**mercadoria
  para revenda**); material de limpeza (**material de consumo**).
- **R-INS-02** — Insumos e mercadorias ficam em contas separadas do Ativo Circulante:
  `Estoque de Insumos` e `Estoque de Mercadorias`. A compra de insumo segue as mesmas
  regras da compra de mercadoria (R-COM-01 a R-COM-04), inclusive o crédito de ICMS.
  Base: CPC 16 (R1), itens 6, 9 a 11; LC 87/96, arts. 19 e 20.
- **R-INS-03** — 📘 **Receita fixa.** Cada hambúrguer vendido consome 1 pão, 1 carne,
  1 queijo e 1 porção de alface. Na venda, o motor baixa cada insumo pelo custo médio
  (R-EST-03) e leva a soma ao custo. Mão de obra, energia e demais gastos do preparo
  **não** entram no custo do lanche: são despesas do período.
  Nota didática: numa empresa real, haveria custo de produção (Contabilidade de Custos).
- **R-INS-04** — Venda de hambúrguer é bloqueada se faltar qualquer insumo da receita
  (extensão de R-EST-04).

Exemplo (custos médios ilustrativos: pão 0,82; carne 3,28; queijo 0,82; alface 0,41):
venda à vista de 100 hambúrgueres a R$ 20,00.

| Lançamento | Débito | Crédito | Valor |
|---|---|---|---|
| Venda | Caixa | Receita Bruta de Vendas | 2.000,00 |
| ICMS | ICMS sobre Vendas | ICMS a Recolher | 360,00 |
| PIS | PIS sobre Faturamento | PIS a Recolher | 13,00 |
| COFINS | COFINS sobre Faturamento | COFINS a Recolher | 60,00 |
| Custo | Custo dos Produtos Vendidos | Estoque de Insumos | 533,00 |

❓ **Nome da conta de custo.** Proponho duas contas: `CMV` para o refrigerante e
`Custo dos Produtos Vendidos (CPV)` para o hambúrguer. A alternativa é uma conta só
("Custo das Vendas"). Qual prefere?

---

## C. Nota com mais de um item

Resolve a pendência nº 1 da seção 14 das regras atuais.

- **R-NOT-01** — Cada item da nota é uma linha com quantidade e valor próprios. ICMS e
  IPI são calculados **por linha** e arredondados por linha (R-GER-02).
- **R-NOT-02** — O frete cobrado na nota é rateado entre as linhas na proporção do
  valor dos produtos de cada uma. O arredondamento de cada parcela é meio para cima; a
  diferença de centavos vai para a linha de maior valor.
- **R-NOT-03** — O lançamento é um só: um débito de estoque por item (na conta do
  item), um débito de ICMS a Recuperar pelo total e um crédito pelo total da nota.

---

## D. Compras: devolução, abatimento e descontos

- **R-DVC-01** — **Devolução de compra.** Sai do estoque pelo **custo com que aquela
  compra entrou** (não pelo custo médio do dia), estorna o ICMS a Recuperar da parte
  devolvida e reduz a dívida com o fornecedor (ou gera valor a receber, se a compra já
  foi paga). Na ficha de estoque, entra como ajuste negativo das entradas.
  Base: CPC 16 (R1), item 11; LC 87/96, arts. 19 e 20.

  Exemplo: compra a prazo de 1.000 carnes a R$ 4,00 (nota 4.000,00; ICMS 720,00;
  estoque 3.280,00). Devolução de 100 unidades:
  `D Fornecedores 400,00 / C Estoque de Insumos 328,00 / C ICMS a Recuperar 72,00`.

- **R-ABC-01** — 📘 **Abatimento sobre compras.** Redução de preço concedida depois da
  nota, sem devolver nada. Reduz o custo do estoque e a dívida, sem mudar a quantidade.
  Simplificação: o abatimento não ajusta o ICMS da nota.
  Base: CPC 16 (R1), item 11.

  Exemplo: abatimento de R$ 200,00 na compra acima:
  `D Fornecedores 200,00 / C Estoque de Insumos 200,00`.

- **R-DSC-01** — **Desconto comercial (incondicional) na compra.** Vem na própria nota
  e não é registrado: a compra entra pelo valor líquido, e o ICMS incide sobre o valor
  líquido.
  Base: CPC 16 (R1), item 11; LC 87/96, art. 13, §1º, II, "a".

  Exemplo: 1.000 carnes a R$ 4,00 com 10% de desconto na nota: nota 3.600,00; ICMS
  648,00; estoque 2.952,00.

- **R-DSC-02** — 📘 **Desconto financeiro obtido.** Desconto por pagar antes do
  vencimento. É **receita financeira**, e não altera o custo do estoque.
  Base: Lei 6.404/76, art. 187, III.
  Nota didática: pelo CPC 16, descontos reduzem o custo de aquisição; as bancas, porém,
  costumam cobrar o desconto condicional como receita financeira.

  Exemplo: título de 3.600,00 pago com 2% de desconto:
  `D Fornecedores 3.600,00 / C Bancos 3.528,00 / C Descontos Financeiros Obtidos 72,00`.

❓ **R-DSC-02.** Confirma o tratamento como receita financeira (o mais cobrado), ou
prefere a leitura do CPC 16?

---

## E. Vendas: devolução, abatimento e descontos

- **R-DVV-01** — **Devolução de venda.** Só vale para o que pode voltar ao estoque: o
  refrigerante e, no arco da fábrica, o hambúrguer congelado. Lanche preparado não é
  devolvido. A devolução:
  1. registra `Devoluções de Vendas` (dedução da receita bruta) contra Clientes ou Caixa;
  2. estorna o ICMS, o PIS e a COFINS da parte devolvida;
  3. devolve a mercadoria ao estoque pelo **custo com que saiu** e estorna o CMV.

  Base: Lei 6.404/76, art. 187, I; DL 1.598/77, art. 12, §1º, I; Lei 9.718/98, art. 3º,
  §2º, I.

  Exemplo: venda a prazo de 200 refrigerantes a R$ 6,00 (receita 1.200,00; ICMS 216,00;
  PIS 7,80; COFINS 36,00; CMV 492,00). Devolução de 50 unidades:

  | Lançamento | Débito | Crédito | Valor |
  |---|---|---|---|
  | Devolução | Devoluções de Vendas | Clientes | 300,00 |
  | ICMS | ICMS a Recolher | ICMS sobre Vendas | 54,00 |
  | PIS | PIS a Recolher | PIS sobre Faturamento | 1,95 |
  | COFINS | COFINS a Recolher | COFINS sobre Faturamento | 9,00 |
  | Estoque | Estoque de Mercadorias | CMV | 123,00 |

- **R-ABV-01** — 📘 **Abatimento sobre vendas.** Redução de preço concedida depois da
  venda, sem devolução. É dedução da receita bruta. Simplificação: não ajusta tributos
  nem estoque.
  Base: Lei 6.404/76, art. 187, I.

  Exemplo: `D Abatimentos sobre Vendas 100,00 / C Clientes 100,00`.

- **R-DSC-03** — **Desconto incondicional concedido.** Vem na nota de venda. A receita
  bruta é registrada cheia e o desconto aparece como dedução. ICMS, PIS e COFINS
  incidem sobre o valor líquido.
  Base: DL 1.598/77, art. 12, §1º, II; LC 87/96, art. 13, §1º, II, "a"; Lei 9.718/98,
  art. 3º, §2º, I.

  Exemplo: 200 refrigerantes a R$ 6,00 com 10% de desconto na nota:
  `D Clientes 1.080,00 / D Descontos Incondicionais Concedidos 120,00 / C Receita Bruta 1.200,00`;
  ICMS 194,40; PIS 7,02; COFINS 32,40.

- **R-DSC-04** — 📘 **Desconto financeiro concedido.** Desconto por receber antes do
  vencimento. É **despesa financeira**.
  Base: Lei 6.404/76, art. 187, III.

  Exemplo: título de 1.080,00 recebido com 5% de desconto:
  `D Bancos 1.026,00 / D Descontos Financeiros Concedidos 54,00 / C Clientes 1.080,00`.

---

## F. Consignação

A hamburgueria é a **consignatária**: a marca de refrigerante deixa uma geladeira cheia
e só cobra o que for vendido.

- **R-CSG-01** — Mercadoria recebida em consignação **não é ativo** da hamburgueria:
  ela não tem o controle. Não há lançamento patrimonial; a quantidade fica num controle
  à parte, visível no jogo.
  Base: CPC 47, itens B77 e B78; CPC 00 (R2), definição de ativo.
- **R-CSG-02** — Na venda de um item consignado, a hamburgueria registra, na mesma
  data, a **compra** das unidades vendidas (R-COM-03) e a **venda** normal, com CMV.
- **R-CSG-03** — A devolução das unidades não vendidas ao consignante não gera
  lançamento.
- **R-CSG-04** — 📘 Simplificação: o ICMS só aparece na compra efetiva e na venda. Na
  vida real, a remessa em consignação já tem nota com imposto destacado.

Exemplo: recebe 300 refrigerantes em consignação a R$ 3,00 (sem lançamento). Vende 100:
`D Estoque de Mercadorias 246,00 / D ICMS a Recuperar 54,00 / C Fornecedores 300,00`,
seguido da venda e do CMV de 246,00. Devolve os 200 restantes: sem lançamento.

❓ **Contas de compensação.** As bancas às vezes cobram o registro da consignação em
contas de compensação. Quer isso como operação, ou só como afirmativa na teoria?

---

## G. Material de consumo

- **R-MCO-01** — Material de limpeza comprado entra em `Material de Consumo` (Ativo
  Circulante) pelo valor total da nota: **não há crédito de ICMS** em material de uso e
  consumo.
  Base: LC 87/96, art. 33, I (crédito só a partir de 1º/1/2033, na redação da LC
  171/2019).
- **R-MCO-02** — No último dia do mês, o jogador informa o que sobrou (o inventário é
  dado da missão). A diferença é o consumo:
  `D Despesa com Material de Consumo / C Material de Consumo`.

Exemplo: compra de 500,00; sobra 180,00 no fim do mês; despesa de 320,00.

---

## H. IPI

- **R-IPI-01** (já existe) — Quem só revende **não recupera** o IPI: ele entra no custo.
  É o caso do refrigerante comprado direto do fabricante.

  Exemplo: produtos 1.000,00 + IPI de 4% (40,00) = nota 1.040,00; ICMS 180,00 (o IPI
  fica fora da base, R-ICMS-03); estoque 860,00.

- **R-IPI-03** — **A hamburgueria em si não é contribuinte do IPI**: o preparo de
  alimentos em lanchonete, para venda direta ao consumidor, não é industrialização.
  Base: RIPI (Decreto 7.212/2010), art. 5º, I.

### Arco da fábrica: hambúrguer congelado

Na história, a casa passa a fabricar **hambúrguer congelado embalado** para vender a
mercados. Essa atividade é industrialização, e a empresa vira contribuinte do IPI.

- **R-IPI-04** — Nas compras para a fábrica, o IPI é **recuperável**:
  `D Estoque / D ICMS a Recuperar / D IPI a Recuperar / C Fornecedores`.
  Base: RIPI, arts. 4º e 226.

  Exemplo: embalagens por 1.000,00 + IPI de 5% (50,00) = nota 1.050,00; ICMS 180,00;
  estoque 820,00; IPI a Recuperar 50,00.

- **R-IPI-05** — Na venda do congelado, o IPI é cobrado **por fora** e não é receita:
  `D Clientes (total da nota) / C Receita Bruta (produtos) / C IPI a Recolher (IPI)`.
  ICMS, PIS e COFINS incidem sobre o valor dos produtos.
  Base: RIPI, art. 190; CPC 47, item 47 (valores cobrados em nome de terceiros).

  Exemplo: venda de 2.000,00 + IPI de 5% (100,00): Clientes 2.100,00; Receita Bruta
  2.000,00; IPI a Recolher 100,00.

- **R-IPI-06** — Apuração mensal do IPI, igual à do ICMS (R-ICMS-06):
  `D IPI a Recolher / C IPI a Recuperar` pelo menor dos dois saldos.
- **R-IPI-07** — 📘 As alíquotas de IPI são **didáticas** e vêm na missão (R-IPI-02).
  Na TIPI, preparações de carne bovina (NCM 1602.50.00) têm alíquota zero, e a reforma
  tributária prevê alíquota zero de IPI para quase tudo a partir de 2027.
- **R-PRD-01** — 📘 **Receita do congelado.** Cada unidade consome 1 carne e 1
  embalagem. A operação "produzir" transfere o custo dos insumos para `Produtos
  Acabados`; a venda baixa `Produtos Acabados` contra CPV. Mão de obra e gastos gerais
  não entram no custo (mesma simplificação de R-INS-03).

❓ **Carne usada nos dois lados.** A carne serve à lanchonete (sem crédito de IPI) e à
fábrica (com crédito). Para não criar um segundo estoque de carne, proponho que só a
**embalagem** do congelado seja comprada com IPI, e que a carne continue vindo sem IPI
do mesmo fornecedor. Assim o IPI recuperável aparece só na embalagem. Serve?

❓ **Apresentação do IPI na venda.** Em R-IPI-05 o IPI vai direto ao passivo. A outra
forma cobrada em prova é `Faturamento Bruto` com `(−) IPI no Faturamento`, chegando à
Receita Bruta. Qual das duas o jogo deve ensinar?

---

## Contas novas (se tudo for aprovado)

| Conta | Grupo |
|---|---|
| Estoque de Insumos | Ativo Circulante |
| Material de Consumo | Ativo Circulante |
| Produtos Acabados | Ativo Circulante |
| IPI a Recuperar | Ativo Circulante |
| IPI a Recolher | Passivo Circulante |
| Devoluções de Vendas | Resultado — Dedução da receita |
| Abatimentos sobre Vendas | Resultado — Dedução da receita |
| Descontos Incondicionais Concedidos | Resultado — Dedução da receita |
| Custo dos Produtos Vendidos (CPV) | Resultado — Custo |
| Despesa com Material de Consumo | Resultado — Despesa operacional |
| Descontos Financeiros Obtidos | Resultado — Receita financeira |
| Descontos Financeiros Concedidos | Resultado — Despesa financeira |

A DRE ganha as linhas de deduções novas e o resultado financeiro.

## Fontes consultadas

- [LC 171/2019 (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp171.htm)
- [Systax — LC 171/2019 prorroga créditos de uso e consumo para 2033](https://www.systax.com.br/?p=7968)
- [RIPI — Decreto 7.212/2010 (Planalto)](https://planalto.gov.br/ccivil_03/_ato2007-2010/2010/decreto/d7212.htm)
- [NetCPA — IPI: industrialização](https://netcpa.com.br/colunas/ipi-industrializacao/18631)
- [SEFAZ-SP — RC 29228/2024](https://legislacao.fazenda.sp.gov.br/Paginas/RC29228_2024.aspx)
- [Legjur — Lei 12.973/2014, capítulo I (DL 1.598/77, art. 12)](https://www.legjur.com/legislacao/nivel/lei_00129732014/capitulo-i-do-imposto-sobre-a-renda-das-pessoas-juridicas-e-da-c)
- [Buscador NCM — 1602.50.00](https://buscadorncm.com.br/ncm/16025000)
- [Legjur — Código Civil, capítulo IV, da sociedade limitada](https://www.legjur.com/legislacao/nivel/lei_00104062002/-capitulo-iv-da-sociedade-limitada)
- [CPC 47 (CVM)](https://conteudo.cvm.gov.br/cvm_institucional/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_47_Rev_14.pdf)
