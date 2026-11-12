# História e estrutura do jogo — v2 (proposta aprovada, a detalhar)

> Este documento registra a direção nova do jogo. As regras novas já foram validadas
> e estão em [regras-contabeis.md](../regras-contabeis.md), seções 15 a 22. Ele ainda
> **não** substitui `gdd.md`, `campanha.md` nem os cenários dourados: isso acontece na
> reescrita da campanha.

## Decisões já tomadas

1. O negócio é uma **hamburgueria de bairro**, com poucos itens e muitas situações.
2. O custo do lanche é a baixa dos insumos por uma **receita fixa**.
3. Existe um **arco industrial** (hambúrguer congelado) para treinar o IPI recuperável.
4. A empresa começa como **sociedade limitada**. S.A. e os demais tipos societários
   ficam na teoria, como comparação.
5. Os cenários dourados serão **reescritos** junto com a nova campanha.
6. O regime tributário continua sendo o **Lucro Presumido**, como simplificação.
7. O refrigerante vendido vai a **CMV**; o hambúrguer e o congelado vão a **CPV**.

## O negócio

Uma hamburgueria na praça da cidade, aberta pelo jogador com o Sr. Osvaldo como sócio
investidor (90% e 10% das quotas). Nome provisório: **Chapa da Praça Ltda.** No mapa,
ela ocupa o lugar da "Minha Loja".

### Catálogo fixo

| Item | Papel contábil |
|---|---|
| Pão, carne, queijo, alface | Insumos do hambúrguer |
| Refrigerante | Mercadoria para revenda |
| Material de limpeza | Material de consumo |
| Embalagem do congelado (só no arco 6) | Insumo da fábrica |

A casa vende **hambúrguer** e **refrigerante**. No arco 6, também **hambúrguer
congelado** para mercados.

## Dois ambientes

- **A empresa (prática):** as operações do dia a dia geram os lançamentos.
- **O Escritório Contábil (conhecimento):** consulta, teoria, revisão e desafios.

## Arcos da história

Cada arco é uma sequência curta de missões, com os mesmos personagens e lugares.

| Arco | Título | O que acontece | Conteúdo |
|---|---|---|---|
| 1 | Abrindo as portas | Contrato social, capital, ponto comercial, chapa e freezer | Entidade, capital subscrito e a integralizar, imobilizado |
| 2 | Primeira semana | Compras de insumos e de refrigerante; primeiras vendas | Custo de aquisição, ICMS, custo médio, receita, deduções, custo das vendas |
| 3 | Problemas de todo dia | Carne fora do padrão, desconto na nota, boleto pago antes do prazo, material de limpeza | Devolução e abatimento de compra, descontos comercial e financeiro, material de consumo |
| 4 | A casa cresce | Encomenda de uma empresa para um evento, devolução de refrigerantes, geladeira em consignação, moto de entrega, funcionários | Venda a prazo, devolução e abatimento de venda, consignação, despesas, competência |
| 5 | Fechando o mês | Depreciação, inventário do material de consumo, apuração do ICMS, DRE e Balanço | Depreciação, não cumulatividade, demonstrações |
| 6 | A fábrica | A casa passa a fabricar hambúrguer congelado para mercados | Industrialização, IPI recuperável, IPI na venda, produtos acabados |

As missões de cada arco, com valores, serão escritas junto com o cenário dourado.

## Escritório Contábil: quatro portas

Ao entrar, o jogador escolhe uma de quatro portas. Cada uma abre uma tela curta.

| Porta | O que tem |
|---|---|
| Consulta | Plano de Contas, Balanço, DRE, Diário e Razão da própria empresa |
| Teoria | Cartões curtos por tema, com exemplo da hamburgueria e uma pergunta |
| Revisão | Baterias de Certo/Errado dos conceitos vencidos (já existe) |
| Desafios | Exercícios rápidos: classificar contas, montar uma DRE, achar o erro |

### Temas da Teoria (não dependem de lançamento)

- Objeto, objetivo e campo de aplicação da Contabilidade.
- Contabilidade como ciência social aplicada.
- Usuários internos e externos.
- Técnicas contábeis: escrituração, demonstrações, auditoria e análise.
- Características qualitativas da informação contábil.
- Regimes de caixa e de competência.
- Plano de Contas: estrutura, classificação e função das contas.
- Estrutura do Balanço e da DRE; finalidade das demonstrações.
- Tipos societários: limitada x S.A. (capital autorizado, ações, quotas).

## Tom dos diálogos

- No máximo três falas curtas por conversa, em linguagem de balcão.
- Os valores saem da fala e vão para um cartão de "nota fiscal" ou "proposta".
- A explicação técnica vem depois da tentativa do jogador, na correção.
- Uma fala por vez, com o jogador tocando para avançar (já implementado).

## Ordem de trabalho

1. ~~Validar as regras novas~~ (feito) e implementá-las no motor (feito).
2. Reescrever os cenários dourados e a campanha com os valores.
3. Trocar o conteúdo (produtos, missões, diálogos) e adaptar o motor.
4. Construir o Escritório com as quatro portas. A Consulta, a Teoria e a Revisão não
   dependem das regras novas e podem começar antes.
