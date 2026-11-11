# GDD — Cidade Contábil (v1.1)

Versão refinada do [conceito original](referencias/conceito-original.md), com as
decisões tomadas antes do início do desenvolvimento.

## 1. Visão

Um jogo de cidade em que cada transação comercial vira estudo ativo de Contabilidade.
O jogador constrói um negócio, toma decisões e aprende a ler os efeitos patrimoniais
e econômicos das suas escolhas.

## 2. Público e tom

- **Principal:** concurseiros (área fiscal e de controle, cargos com Contabilidade
  Geral no edital).
- **Secundário:** estudantes de Ciências Contábeis.
- Terminologia formal da Lei 6.404/76 e dos CPCs. Afirmativas no estilo de banca,
  incluindo as "pegadinhas" clássicas, sempre com explicação.

## 3. Plataforma

- Celular, **tela em retrato**. Toque para andar; painéis abrem como folhas
  (bottom sheet) sobre o mapa.
- Roda no navegador durante o desenvolvimento; empacotado com Capacitor para
  Android/iOS.
- Offline na v1, com progresso salvo localmente.

## 4. Pilares

1. **A contabilidade é a mecânica.** Toda ação tem consequência contábil correta e visível.
2. **Fazer antes de responder.** A operação acontece primeiro; a afirmativa vem depois,
   sobre o que o jogador acabou de fazer.
3. **Estudo ativo dosado.** Poucas afirmativas por operação; repetição espaçada
   decide o que volta ([fluxo-afirmativas.md](fluxo-afirmativas.md)).
4. **Rigor técnico.** Nada que um concurseiro aprenda aqui pode estar errado na prova.

## 5. Entidade: pessoa x empresa

Regra explícita do jogo (ADR-0004):

- **Carteira pessoal** do avatar: dinheiro da pessoa física. Fica fora da contabilidade.
- **Caixa e Bancos da empresa:** fazem parte do razão.
- O HUD mostra as duas, com rótulos e ícones diferentes ("Sua carteira" e
  "Caixa da empresa").
- A primeira missão é a **integralização de capital**: o avatar transfere dinheiro da
  carteira para a empresa (D Caixa / C Capital Social).
- Pagar uma despesa pessoal com o caixa da empresa é bloqueado e gera uma explicação
  sobre o princípio da entidade.

## 6. Ciclo de jogo

1. **Explorar:** andar até um estabelecimento ou NPC com indicador de oferta.
2. **Negociar:** aceitar ou recusar uma proposta (quantidade, preço, prazo).
3. **Ver o efeito:** animação no mundo (caixas na prateleira) e painel de impacto
   (contas que sobem e descem).
4. **Responder:** de 0 a 2 afirmativas sobre a operação.
5. **Lançar:** montar ou confirmar o lançamento (o nível de ajuda varia; seção 9).
6. **Evoluir:** pontos, progresso por conceito e desbloqueios.

## 7. Estabelecimentos do MVP (5)

| Estabelecimento | Operações na v1 | Conteúdos |
|---|---|---|
| Minha Loja | Vendas à vista e a prazo para clientes NPC; ver estoque | Receita bruta, deduções, CMV, Clientes |
| Fornecedor (fábrica) | Compras à vista e a prazo; nota com ICMS, IPI e frete | Custo de aquisição, ICMS a Recuperar, Fornecedores |
| Banco | Depósitos, saques, pagamentos e recebimentos | Disponibilidades |
| Escritório Contábil | Livro Diário, Razão, Balancete, Balanço, DRE; Revisão | Demonstrações; repetição espaçada |
| Posto Fiscal (SEFAZ) | Apuração e pagamento do ICMS | Não cumulatividade, ICMS a Recolher |

Depois do MVP: Prefeitura (taxas municipais, alvará), Transportadora, Imobiliária,
funcionários, empréstimos e imobilizado.

## 8. Tempo de jogo

- Calendário em **dias**. Cada dia tem um número limitado de ações; "encerrar o dia"
  avança o calendário.
- O prazo das operações (ex.: 30 dias) usa esse calendário. Títulos vencidos aparecem
  como alertas.
- No **fim do mês** acontece a apuração do ICMS no Posto Fiscal, junto com um
  fechamento: Balancete e DRE do mês, com afirmativas de fechamento.
- O número de ações por dia é um parâmetro de balanceamento (sugestão inicial: 10).

## 9. Progressão

| Nível | Etapa | Conteúdo | Ajuda no lançamento |
|---|---|---|---|
| 1 | Microempreendedor | Ativo, Passivo, PL; integralização; entidade | Lançamento pronto, só confirmar |
| 2 | Comerciante | Compras e vendas; CMV; custo médio | Contas sugeridas; jogador escolhe D/C |
| 3 | Empresário | Operações a prazo; ICMS, IPI e frete na compra | Jogador escolhe contas, D/C e valores |
| 4 | Administrador | Deduções da receita; apuração do ICMS; DRE | Lançamento livre |
| 5 | Grande empresário | Balanço, DRE e análise | Lançamento livre + fechamento mensal |

O MVP cobre os níveis 1 a 4. O nível 5 completo e os conteúdos fora do MVP vêm depois.

## 10. HUD (retrato)

- Topo: avatar e nível, Sua carteira, Caixa da empresa, pontos, dia/mês, configurações.
- Mapa ocupando a tela.
- Atalhos inferiores: Missões, Escritório (Diário/Balanço/DRE/Revisão), Progresso.
- Painéis em bottom sheet: negociação → efeito → afirmativas → lançamento.

## 11. Fora do escopo da v1

- Conta online, sincronização e ranking.
- ICMS interestadual, ST, DIFAL; alíquotas diferentes por produto.
- Crédito de PIS/COFINS (Lucro Real).
- IRPJ/CSLL do Lucro Presumido (apuração trimestral).
- Folha de pagamento, imobilizado, depreciação e empréstimos.
- Arte final: a v1 usa placeholders ou pacote de assets livre.
