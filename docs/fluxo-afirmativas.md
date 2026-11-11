# Fluxo de afirmativas (Certo/Errado)

O estudo ativo acontece respondendo afirmativas no estilo de banca. O desafio é
**dosar**: a afirmativa reforça o que o jogador acabou de fazer, sem transformar o
jogo numa prova.

## 1. Princípios

1. **A operação vem primeiro.** Negociar → ver o efeito → então a afirmativa, ligada à
   operação concreta.
2. **Limite por operação.** No máximo **2 afirmativas** numa operação comum. Até 4 só
   em momentos especiais: fechamento do mês ou missão de fim de nível.
3. **Repetição espaçada decide o que aparece.** O que o jogador domina aparece menos;
   o que ele erra volta depois, em outra operação e com outra redação.
4. **Volume é opcional.** Baterias longas só no Escritório Contábil → Revisão.
5. **Toda resposta explica.** Explicação curta e um link para a regra
   (`regras-contabeis.md`).

## 2. Momentos de disparo

| Momento | Quantidade | Exemplos de conceito |
|---|---|---|
| Após uma operação | 0–2 | ICMS por dentro, IPI no custo, competência |
| Antes de confirmar o lançamento (níveis 2+) | 0–1 | natureza da conta, lado D/C |
| Fechamento do mês | 2–4 | apuração do ICMS, DRE, receita líquida |
| Fim de nível | 3–4 | revisão dos conceitos do nível |
| Revisão (opcional) | sob demanda | qualquer conceito vencido no espaçamento |

Quando nenhum conceito ligado à operação está "vencido" no espaçamento, a operação
pode terminar **sem afirmativa**. Isso é desejável.

## 3. Seleção

Para cada operação:
1. Liste os **conceitos** tocados pela operação (cada afirmativa tem `conceitoId`).
2. Filtre pelas afirmativas com `nivelMin ≤ nível do jogador`.
3. Priorize os conceitos vencidos (caixa mais baixa / data de revisão passada).
4. Dentro do conceito, escolha uma **variante ainda não vista** (ou a vista há mais tempo).
5. Respeite o limite do momento.

## 4. Repetição espaçada (Leitner simplificado)

- Cada conceito do jogador fica numa **caixa de 1 a 5**. Conceito novo começa na caixa 1.
- Acerto → sobe uma caixa. Erro → volta para a caixa 1.
- Intervalo até a próxima cobrança, em **dias de jogo**: caixa 1 = 0 (próxima
  oportunidade), 2 = 1, 3 = 3, 4 = 7, 5 = 15.
- Os intervalos são parâmetros de balanceamento.
- A tela de Progresso mostra a força de cada conceito (caixas), funcionando como um
  "caderno de erros".

## 5. Modo banca (opcional)

Chave em Configurações, desligada por padrão.

- **Desligado:** acerto +pontos; erro mostra a explicação; sem penalidade.
- **Ligado (estilo CEBRASPE):** acerto +1, erro −1, branco 0. Aparece a opção
  "Deixar em branco". Placar líquido por sessão e por conceito.
- O modo banca não muda a repetição espaçada (branco conta como "não sabe" → caixa 1).

## 6. Redação

- Afirmativas curtas, uma ideia por afirmativa.
- Usar as pegadinhas clássicas: "despesa" x "custo", "sempre/nunca", inversão de D/C,
  ICMS "por fora", IPI recuperável no comércio.
- Cada conceito tem **pelo menos 3 variantes** (algumas certas, algumas erradas), para
  a repetição não virar decoreba de enunciado.
- A explicação diz **por que** está certa ou errada, em até ~2 frases.
