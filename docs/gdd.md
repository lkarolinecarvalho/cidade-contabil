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
- A empresa é a **Chapa da Praça Ltda.**, uma hamburgueria: o avatar tem 90% das quotas e
  o Sr. Osvaldo, sócio investidor que só aparece na narrativa, tem 10% (ADR-0010).
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
| Hamburgueria | Vendas à vista e a prazo; devoluções e abatimentos de venda; equipar a casa; produção; salários e energia | Receita, deduções, CMV e CPV, Clientes, imobilizado, despesas |
| Fornecedor (Distribuidora) | Compras de insumos, refrigerante e material de limpeza; devoluções, abatimentos e descontos; consignação | Custo de aquisição, ICMS e IPI, Fornecedores, consignação |
| Banco | Integralizações, depósitos, pagamentos e recebimentos | Disponibilidades |
| Escritório Contábil | Contrato social e fechamento do mês (missões). Pelo atalho: Consulta, Teoria, Revisão e Desafios | Capital social, demonstrações, teoria, repetição espaçada |
| Posto Fiscal (SEFAZ) | Apuração e pagamento do ICMS | Não cumulatividade, ICMS a Recolher |
| Imobiliária | Compra do imóvel da loja | Imobilizado x Estoque x Propriedade para Investimento |

Depois do MVP: Prefeitura (taxas municipais, alvará), Transportadora, empréstimos,
veículos e propriedade para investimento (capítulo 8 da campanha).

## 7A. Campanha

O jogo é a campanha "Chapa da Praça", em 6 capítulos ([campanha.md](campanha.md),
ADR-0010). O catálogo é fixo e pequeno (quatro insumos, o refrigerante e o material de
limpeza); o que muda é a condição de cada operação. Depois da campanha, o jogo segue
em modo livre.

O jogo tem dois ambientes: a **empresa**, que ensina a prática pelas operações do dia a
dia, e o **Escritório Contábil**, que será a central de consulta, teoria, revisão e
desafios ([v2/historia.md](v2/historia.md)).

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

- Topo: uma barra com o retrato, o nível, o dinheiro da empresa e a data; tocar nela abre
  o resumo (carteira pessoal, Caixa e Bancos, pontos, botão do Balanço). A engrenagem
  fica ao lado.
- Abaixo da barra, o **aviso do próximo destino** ("Vá ao Banco"), que muda a cada missão.
- Mapa ocupando a tela.
- Atalhos inferiores: Missões (a campanha por capítulo), Calendário, Escritório e Progresso
  (tocar num conceito mostra a definição).
- O painel do estabelecimento abre no meio da tela: negociação → efeito → afirmativas →
  lançamento. Há sempre um "Voltar" até a operação ser gravada, e a missão concluída
  fecha o painel.
- **Escritório Contábil** (atalho): quatro portas.
  - Consulta: Plano de Contas, Balanço, DRE, Diário e Razão da própria empresa.
  - Teoria: temas em passos curtos, com um exemplo da hamburgueria e perguntas.
  - Revisão: baterias de Certo/Errado dos conceitos vencidos.
  - Desafios: "Onde fica a conta?", "Devedora ou credora?" e "Monte a DRE".

## 11. Fora do escopo da v1

- Conta online, sincronização e ranking.
- ICMS interestadual, ST, DIFAL; alíquotas diferentes por produto.
- Crédito de PIS/COFINS (Lucro Real).
- IRPJ/CSLL do Lucro Presumido (apuração trimestral).
- Encargos sobre a folha, ICMS no imobilizado (CIAP), ITBI (simplificações 📘).
- Empréstimos, veículos, propriedade para investimento, perdas de crédito (capítulo 8).
- Arte final: a v1 usa placeholders ou pacote de assets livre.
