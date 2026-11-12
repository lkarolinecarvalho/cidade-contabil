# Campanha — "Chapa da Praça"

A empresa é uma hamburgueria de bairro: a **Chapa da Praça Ltda.** O avatar tem 90% das
quotas; o **Sr. Osvaldo**, sócio investidor, tem 10% e só aparece na narrativa
(ADR-0010). Os valores completos estão em [cenario-campanha.md](cenario-campanha.md).

A campanha tem **6 capítulos** e 28 missões, todas no mês 1. O catálogo é fixo e
pequeno: pão, carne, queijo e alface (insumos), refrigerante (mercadoria para revenda)
e material de limpeza (consumo). No capítulo 5 entram a embalagem e o hambúrguer
congelado. A casa vende hambúrguer e refrigerante.

| Cap. | Título | Onde | Operações | Conceitos principais | Nível |
|---|---|---|---|---|---|
| 1 | Abrindo as portas | Escritório, Banco, Imobiliária, Hamburgueria | Duas conversas com a Marta (sem lançamento); contrato social, duas integralizações, ponto comercial, mesas e balcão, chapa e freezer | Capital subscrito e a integralizar, entidade, imobilizado | 1 |
| 2 | Primeira semana | Fornecedor, Hamburgueria | Refrigerante à vista com IPI; insumos a prazo (nota com quatro itens); inauguração | Custo de aquisição, ICMS, IPI no custo, insumos x mercadorias, receita, CMV e CPV | 2 |
| 3 | Problemas de todo dia | Fornecedor, Banco | Devolução e abatimento de compra; compra com desconto na nota; pagamento antecipado; material de limpeza | Devolução, abatimento, desconto comercial e financeiro, material de consumo | 3 |
| 4 | A casa cresce | Hamburgueria, Banco, Fornecedor | Encomenda a prazo com desconto; devolução e abatimento de venda; recebimento antecipado; consignação; salários; energia | Venda a prazo, deduções da receita, consignação, competência, despesas | 3–4 |
| 5 | A fábrica | Fornecedor, Hamburgueria | Embalagens com IPI recuperável; produção; venda do congelado com IPI | Industrialização, IPI recuperável, IPI na venda, produtos acabados | 4 |
| 6 | Fechando o mês | Escritório, Posto Fiscal | Depreciação; inventário do material de consumo; apuração do ICMS e do IPI | Depreciação, não cumulatividade, DRE, Balanço | 5 |

## O começo: a Marta apresenta a Contabilidade

O jogador não começa lançando. As duas primeiras missões são **conversas** com a Marta,
no Escritório: ela se apresenta ("vamos começar do zero") e explica, um cartão por vez e
com exemplos da própria casa, o que o iniciante precisa antes do primeiro fato:

| Conversa | Explicações (temas de `teoria.json`) |
|---|---|
| Começando do zero | O que é Contabilidade (ciência social aplicada, objeto, finalidade); o que é patrimônio (Ativo, Passivo, PL e a equação, com quadro); por que registrar tudo |
| Para que serve a Contabilidade | As técnicas contábeis; controlar não basta, é preciso decidir; quem usa a informação (usuários internos e externos) |

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
| 2 | Estoque pelo valor da nota | Estoque superavaliado; ICMS a Recuperar zerado |
| 2 | Compra como despesa | Prejuízo falso no mês |
| 2 | Venda sem baixar o custo | Lucro superavaliado; estoque que não diminui |
| 3 | Pagamento de obrigação como despesa nova | Resultado pior do que é |
| 4 | Lançar a mercadoria recebida em consignação | Ativo e Passivo maiores do que são |
| 4 | Salário lançado como pagamento | A despesa é do mês; o pagamento é outro fato |

As operações novas também têm comentário próprio do contador: devolução de compra como
receita ou sem estornar o ICMS, abatimento como receita, desconto financeiro no estoque,
crédito de ICMS em material de consumo, devolução de venda direto na receita, abatimento
de venda como despesa, IPI recuperável no custo, IPI da venda como receita e produção
como custo do período. Os demais erros caem no comentário genérico.

## Depois da campanha

O jogo segue em modo livre: o jogador liquida os títulos em aberto e fecha os meses
seguintes. Ainda não há ofertas novas depois do capítulo 6.
