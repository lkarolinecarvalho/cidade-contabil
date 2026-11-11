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
- A empresa é a **Mercado Vila Nova S.A.**: o avatar é o acionista controlador (90%) e
  um investidor NPC tem 10% (ADR-0007). No capítulo 1, o avatar subscreve e integraliza
  capital, e a carteira diminui pela parte dele.
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

## 7. Estabelecimentos do MVP (6)

| Estabelecimento | Operações na v1 | Conteúdos |
|---|---|---|
| Minha Loja | Vendas à vista e a prazo; equipar a loja; salários e energia | Receita, deduções, CMV, Clientes, imobilizado, despesas |
| Fornecedor (Distribuidora) | Compras à vista e a prazo; nota com ICMS, IPI e frete; pagamentos | Custo de aquisição, ICMS a Recuperar, Fornecedores |
| Banco | Integralizações, depósitos, pagamentos e recebimentos | Disponibilidades |
| Escritório Contábil | Constituição da empresa; Diário, Razão, Balancete, DRE, Balanço; Revisão | Capital social, demonstrações, repetição espaçada |
| Posto Fiscal (SEFAZ) | Apuração e pagamento do ICMS | Não cumulatividade, ICMS a Recolher |
| Imobiliária | Compra do imóvel da loja | Imobilizado x Estoque x Propriedade para Investimento |

Depois do MVP: Prefeitura (taxas municipais, alvará), Transportadora, empréstimos,
veículos e propriedade para investimento (capítulo 8 da campanha).

## 7A. Campanha

O MVP é a campanha "O Primeiro Negócio", capítulos 1 a 7 ([campanha.md](campanha.md),
ADR-0008). Os tributos sobre mercadorias entram no capítulo 4. Depois da campanha, o
jogo segue em modo livre: o jogador continua operando a loja com as mesmas regras.

## 8. Tempo de jogo

- Calendário em **dias**. Cada dia tem um número limitado de ações; "encerrar o dia"
  avança o calendário.
- O prazo das operações (ex.: 30 dias) usa esse calendário. Títulos vencidos aparecem
  como alertas.
- No **fim do mês** acontece a apuração do ICMS no Posto Fiscal, junto com um
  fechamento: Balancete e DRE do mês, com afirmativas de fechamento.
- O número de ações por dia é um parâmetro de balanceamento (sugestão inicial: 10).

## 9. Progressão

| Nível | Etapa | Capítulos | Conteúdo | Ajuda no lançamento |
|---|---|---|---|---|
| 1 | Fundador | 1–3 | PL, capital social, entidade, imobilizado | Lançamento pronto, só confirmar |
| 2 | Comerciante | 4–5 | Compras com ICMS, vendas, CMV, custo médio | Contas sugeridas; jogador escolhe D/C |
| 3 | Empresário | 6 | Passivo, despesas, competência | Jogador escolhe contas, D/C e valores |
| 4 | Administrador | 7 | Depreciação, apuração do ICMS, DRE e Balanço | Lançamento livre |
| 5 | Grande empresário | 8 | Empréstimos, PPI, inadimplência, fechamento anual | Lançamento livre (pós-MVP) |

O MVP cobre os níveis 1 a 4.

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
- Encargos sobre a folha, ICMS no imobilizado (CIAP), ITBI (simplificações 📘).
- Empréstimos, veículos, propriedade para investimento, perdas de crédito (capítulo 8).
- Arte final: a v1 usa placeholders ou pacote de assets livre.
