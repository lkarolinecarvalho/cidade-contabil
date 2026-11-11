# ADR-0002 — Regime tributário

**Status:** aceito

## Contexto
O jogo precisa ensinar tributos sobre compras e vendas, inclusive a não cumulatividade
do ICMS. No Simples Nacional, o comerciante em regra não aproveita crédito de ICMS,
o que esconderia o conceito. O público principal são concurseiros.

## Decisão
- A empresa do jogador é tributada pelo **Lucro Presumido**.
- ICMS recuperável (regime normal), PIS/COFINS cumulativo (sem crédito), IPI integrando
  o custo (comerciante), frete na nota integrando o custo.
- A v1 ensina o **modelo vigente antes da Reforma Tributária** (EC 132/2023,
  LC 214/2025).
- Tributos e alíquotas ficam em **config parametrizável**, não no código, para um
  futuro "modo pós-reforma" (CBS/IBS) e para o Lucro Real.

## Consequências
- O jogo cobre o que mais cai em Contabilidade Geral nas provas atuais.
- Risco: conforme a transição avança (CBS a partir de 2027, IBS 2029–2032), editais
  novos podem passar a cobrar o modelo novo. A parametrização reduz o custo de adaptar.
- IRPJ/CSLL do Presumido (trimestral) ficam fora da v1.
