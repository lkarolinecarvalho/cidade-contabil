# Campanha — "O Primeiro Negócio"

Versão reconciliada da [história original](referencias/historia-campanha.md). O MVP
cobre os **capítulos 1 a 7**. Os valores completos estão em
[cenario-campanha.md](cenario-campanha.md).

A empresa: **Mercado Vila Nova S.A.** O avatar é o acionista controlador (90%); o
**Sr. Osvaldo**, investidor NPC, tem 10% e só aparece na narrativa (ADR-0007).

| Cap. | Título | Estabelecimento | Operações | Conceitos principais | Nível |
|---|---|---|---|---|---|
| 1 | Nasce uma empresa | Escritório Contábil, Banco | Capital autorizado; subscrição; integralização parcial | PL, capital autorizado/subscrito/a integralizar, entidade | 1 |
| 2 | Comprando o terreno e a loja | Imobiliária, Banco | Compra de terreno e edificação | ANC, Imobilizado x Estoque x Propriedade para Investimento | 1 |
| 3 | Equipando a loja | Banco, Minha Loja | Integralização final; móveis e equipamentos | Imobilizado, disponibilidades | 1 |
| 4 | Comprando as mercadorias | Fornecedor (Distribuidora) | Compra à vista e a prazo **com ICMS** | Estoque, custo de aquisição, ICMS por dentro e a recuperar, Fornecedores | 2 |
| 5 | A grande inauguração | Minha Loja | Venda à vista e a prazo | Receita bruta, deduções, CMV, Clientes, custo médio | 2 |
| 6 | Pagando as obrigações | Fornecedor, Banco, Minha Loja | Pagamento parcial; salários; energia | Passivo, despesas, competência | 3 |
| 7 | O primeiro fechamento | Escritório Contábil, Posto Fiscal | Depreciação; apuração do ICMS; DRE e Balanço | Depreciação, não cumulatividade, DRE, BP | 4 |
| 8 | A empresa começa a crescer | Banco, Imobiliária, Prefeitura | Empréstimo, veículo, PPI, inadimplência, fechamento anual | — | 5 (pós-MVP) |

## Consequências no mundo

| Cap. | O que muda na cidade |
|---|---|
| 1 | Placa "Mercado Vila Nova S.A." no terreno vazio; HUD mostra carteira e banco da empresa |
| 2 | O jogador recebe as chaves; a construção aparece no mapa |
| 3 | A loja ganha balcões, prateleiras e computador |
| 4 | Um caminhão entrega as mercadorias; Fornecedores aparece em "contas a pagar" |
| 5 | A loja abre; clientes NPC entram; o restaurante aparece como cliente devedor |
| 6 | Funcionários aparecem na loja; alertas de vencimento |
| 7 | O contador chama o jogador ao Escritório; o Posto Fiscal mostra o saldo credor de ICMS |

## Erros didáticos previstos (prévia do erro)

O lançamento do jogador nunca é gravado (ADR-0005). Quando ele erra com um lançamento
equilibrado, o jogo mostra a **prévia** de como ficariam a DRE e o Balanço, comparada
com o correto, e o contador comenta. Erros-chave para roteirizar:

| Capítulo | Erro | O que a prévia mostra |
|---|---|---|
| 1 | Lançar o capital autorizado | PL inflado sem dinheiro entrando |
| 2 | Imóvel de uso como Estoque | Ativo Circulante inflado; imóvel "à venda" |
| 4 | Estoque pelo valor da nota | Estoque superavaliado; ICMS a Recuperar zerado |
| 4 | Compra como despesa | Prejuízo falso no mês |
| 5 | Venda sem CMV | Lucro superavaliado; estoque que não diminui |
| 6 | Salário só no pagamento | Despesa no mês errado (competência) |
| 8 | Empréstimo como receita | Lucro falso (pós-MVP) |
