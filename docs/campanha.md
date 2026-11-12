# Campanha — "Chapa da Praça"

A empresa é uma hamburgueria de bairro: a **Chapa da Praça Ltda.** O avatar tem 90% das
quotas; o **Sr. Osvaldo**, sócio investidor, tem 10% e só aparece na narrativa
(ADR-0010). Os valores completos estão em [cenario-campanha.md](cenario-campanha.md).

A campanha tem **8 capítulos** e 38 missões (34 com operação e 4 conversas com a
Marta), todas no mês 1. O catálogo é fixo e pequeno: pão, carne, queijo e alface
(insumos), refrigerante (mercadoria para revenda) e material de limpeza (consumo). No
capítulo 7 entram a embalagem e o hambúrguer congelado. A casa vende hambúrguer e
refrigerante.

## Progressão pedagógica

O jogo parte do princípio de que o jogador não sabe nada de Contabilidade.

1. **Cada conceito novo tem uma introdução.** Antes da operação que usa um conceito pela
   primeira vez, a Marta o apresenta numa aula curta (tema de `teoria.json`, campo
   `aulas` da missão). A sequência de toda missão é:
   contexto → explicação → exemplo → operação → lançamento → consequência.
2. **Primeiro o raciocínio, depois os impostos.** Os capítulos 2 e 3 trabalham com o
   valor total das notas, sem tributos destacados (R-DID-01).
3. **Os tributos entram quando a casa cresce.** O capítulo 4 abre com uma conversa em
   que a Marta apresenta os tributos, um conceito por vez.
4. **Situações parecidas, tratamentos diferentes.** As notas com imposto identificam
   quem vende, quem compra e a finalidade. Ao fim de algumas missões, o jogo compara
   duas notas lado a lado (campo `comparacao`), com valores calculados pelo motor.
5. **A consequência aparece.** Ao concluir a missão, o jogador vê o saldo de antes e o
   de depois de cada conta que mudou.

| Cap. | Título | Onde | Operações | Conceitos principais | Nível |
|---|---|---|---|---|---|
| 1 | Abrindo as portas | Escritório, Banco, Imobiliária, Hamburgueria | Três conversas com a Marta (sem lançamento); contrato social, duas integralizações, ponto comercial, mesas e balcão, chapa e freezer | Patrimônio, contas, lançamento, capital, entidade, imobilizado | 1 |
| 2 | Primeira semana | Fornecedor, Banco, Hamburgueria | Sem tributos: refrigerante à vista; insumos a prazo; pagamento ao fornecedor; inauguração | Compra à vista e a prazo, estoque, Fornecedores, pagamento, receita, custo (CMV e CPV) | 2 |
| 3 | A casa funcionando | Hamburgueria, Banco | Sem tributos: encomenda a prazo; recebimento do cliente; salários; energia | Venda a prazo, Clientes, recebimento, despesas, competência | 2 |
| 4 | Os impostos entram em cena | Escritório, Fornecedor, Hamburgueria | Conversa sobre tributos; insumos com ICMS (situação C); refrigerante da fábrica (B); material de limpeza da fábrica (A e E); venda com ICMS, PIS e COFINS | Tributo recuperável ou não, crédito de ICMS, IPI e a base do ICMS, custo de aquisição, deduções da receita | 3 |
| 5 | Problemas de todo dia | Fornecedor, Banco, Hamburgueria | Devolução e abatimento de compra; compra com desconto na nota; pagamento antecipado; encomenda com desconto; devolução e abatimento de venda; recebimento antecipado | Devolução, abatimento, desconto comercial e financeiro | 3 |
| 6 | A geladeira da marca | Fornecedor, Hamburgueria | Consignação: receber, vender e devolver | Consignação | 4 |
| 7 | A fábrica | Fornecedor, Hamburgueria | Embalagens com IPI recuperável (situação D); produção; venda do congelado com IPI | Industrialização, IPI recuperável, IPI na venda, produtos acabados | 4 |
| 8 | Fechando o mês | Escritório, Posto Fiscal | Depreciação; inventário do material de consumo; apuração do ICMS e do IPI | Depreciação, não cumulatividade, DRE, Balanço | 5 |

## As situações tributárias (capítulos 4 e 7)

Cada nota identifica o emitente, o destinatário e a finalidade (regras na seção 23 de
`regras-contabeis.md`).

| Situação | Missão | Nota | O que ensina |
|---|---|---|---|
| C | Nota com imposto | Insumos, de atacadista, para os lanches | ICMS recuperável e os requisitos do crédito |
| B | Direto da fábrica | Refrigerante, da indústria, para revenda | IPI fora da base do ICMS; ICMS volta; IPI vai ao custo |
| A e E | Casa limpa | Material de limpeza, da indústria, para uso e consumo | IPI dentro da base do ICMS; nenhum tributo volta |
| D | Embalagens para o congelado | Embalagem, da indústria, para industrialização | IPI e ICMS recuperáveis |

Comparações ao fim da missão: "Casa limpa" × "Direto da fábrica" (mesma estrutura de
nota, finalidades diferentes) e "Embalagens para o congelado" × "Direto da fábrica" (o
mesmo IPI, custo para quem revende e crédito para a indústria).

## O começo: a Marta apresenta a Contabilidade

O jogador não começa lançando. As três primeiras missões são **conversas** com a Marta,
no Escritório: ela se apresenta ("vamos começar do zero") e explica, um cartão por vez e
com exemplos da própria casa, o que o iniciante precisa antes do primeiro fato:

| Conversa | Explicações (temas de `teoria.json`) |
|---|---|
| Começando do zero | O que é Contabilidade (ciência social aplicada, objeto, finalidade); o que é patrimônio (Ativo, Passivo, PL e a equação, com quadro); por que registrar tudo |
| Para que serve a Contabilidade | As técnicas contábeis; controlar não basta, é preciso decidir; quem usa a informação (usuários internos e externos) |
| Como a gente anota | Contas, débito e crédito; o lançamento e as partidas dobradas |

Essas missões não têm operação: não gastam ação do dia, não mexem no razão e não entram
no cenário dourado. Valem pontos, e os temas ficam para rever no Escritório, em Teoria.
Quem já sabe pode pular as explicações.

## Consequências no mundo

| Quando | O que muda no mapa |
|---|---|
| Início | O lugar da hamburgueria é um terreno cercado, com placa de "Vende-se" |
| Compra do ponto (capítulo 1) | A hamburgueria aparece no terreno, com a placa e a Bia na porta |

As demais etapas (casa mobiliada, aberta, com clientes) ainda não têm versão própria no mapa.

## Como as missões são contadas

- Cada conversa tem no máximo três falas curtas, uma por vez.
- Os valores da operação ficam no **cartão da proposta** (a "nota"), que aparece na
  última fala e na etapa do lançamento.
- Receber e devolver mercadoria em consignação são missões **sem lançamento**: o
  jogador precisa perceber que não há o que lançar.

## Erros didáticos previstos (prévia do erro)

O lançamento do jogador nunca é gravado (ADR-0005). Quando ele erra com um lançamento
equilibrado, o jogo mostra a **prévia** de como ficariam a DRE e o Balanço, comparada
com o correto, e o contador comenta.

| Capítulo | Erro | O que a prévia mostra |
|---|---|---|
| 1 | Imóvel de uso como Estoque | Ativo Circulante inflado; imóvel "à venda" |
| 4 | Estoque pelo valor da nota | Estoque superavaliado; ICMS a Recuperar zerado |
| 2 e 4 | Compra como despesa | Prejuízo falso no mês |
| 2 a 4 | Venda sem baixar o custo | Lucro superavaliado; estoque que não diminui |
| 2 e 5 | Pagamento de obrigação como despesa nova | Resultado pior do que é |
| 6 | Lançar a mercadoria recebida em consignação | Ativo e Passivo maiores do que são |
| 3 | Salário lançado como pagamento | A despesa é do mês; o pagamento é outro fato |

As operações novas também têm comentário próprio do contador: devolução de compra como
receita ou sem estornar o ICMS, abatimento como receita, desconto financeiro no estoque,
crédito de ICMS em material de consumo, devolução de venda direto na receita, abatimento
de venda como despesa, IPI recuperável no custo, IPI da venda como receita e produção
como custo do período. Os demais erros caem no comentário genérico.

## Depois da campanha

O jogo segue em modo livre: o jogador liquida os títulos em aberto e fecha os meses
seguintes. Ainda não há ofertas novas depois do capítulo 8.
