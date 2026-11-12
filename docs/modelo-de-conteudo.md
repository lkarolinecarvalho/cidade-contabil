# Modelo de conteúdo

Missões e afirmativas são JSON em `packages/content/data`, validados por schemas zod
em `packages/content/src`. A validação roda nos testes e no build: conteúdo inválido
quebra o CI.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `capitulos.json` | Número e título de cada capítulo da campanha |
| `missoes/*.json` | Uma missão por arquivo |
| `afirmativas/*.json` | Afirmativas de Certo/Errado, por conceito |
| `conceitos.json` | Conceitos, com nível e uma **definição curta** (mostrada no Progresso) |
| `teoria.json` | Temas de teoria do Escritório: pontos curtos, um exemplo e perguntas |
| `produtos.json`, `npcs.json`, `estabelecimentos.json` | Cadastros |

## Missão

A missão descreve **a operação**, nunca o lançamento. O lançamento esperado é
calculado pelo `ledger` a partir da operação (ADR-0005).

```jsonc
{
  "id": "m008-desconto-na-nota",
  "titulo": "Desconto para compensar",
  "capitulo": 3,                             // capítulo da campanha (omitir no modo livre)
  "nivel": 3,
  "estabelecimento": "fornecedor",          // id do estabelecimento no mapa
  "npc": "joao-fornecedor",
  "requisitos": ["m008-abatimento-compra"],  // missões concluídas antes
  "dialogo": [                               // no máximo 3 falas curtas, uma por vez
    { "fala": "npc", "texto": "Para compensar o transtorno, a próxima carne sai com desconto, já na nota." }
  ],
  "proposta": {                              // cartão com os dados da operação: os valores ficam aqui
    "titulo": "Nota c2 do fornecedor",
    "linhas": ["500 carnes a R$ 4,00: R$ 2.000,00", "Desconto de 10% na nota: R$ 200,00", "A prazo: 30 dias"]
  },
  "operacoes": [{                           // várias operações, em ordem
    "tipo": "compra",
    "nota": "c2",                            // identificador, para devoluções e abatimentos depois
    "itens": [{ "produto": "carne", "quantidade": 500, "precoUnitarioCentavos": 400 }], // vários itens por nota
    "ipiAliquota": 0,                        // em pontos-base: 10% = 1000
    "freteCentavos": 0,
    "descontoComercial": 1000,               // opcional, em pontos-base
    "condicao": { "tipo": "prazo", "dias": 30 } // ou { "tipo": "avista", "meio": "caixa" | "bancos" | "escolha_do_jogador" }
  }],
  "ajudaLancamento": "auto",                 // auto (pelo nível) | pronto | contas_sugeridas | contas_e_valores | livre
  "conceitos": ["desconto-comercial", "custo-medio"],
  "recompensa": { "pontos": 80 }
}
```

**Missão de conversa.** Com `"operacoes": []`, a missão é uma conversa com a contadora:
primeiro as falas de `dialogo`, depois os temas de `aulas` (obrigatório), e nenhum
lançamento. Nela não há `proposta` e `conceitos` fica vazio. Nas missões com operação,
`aulas` é opcional e os temas aparecem antes da conversa, na primeira vez.

Um tema de teoria pode ter um `quadro` de dois lados (`esquerda` e `direita`, com
blocos de `titulo`, `legenda` e `itens`), mostrado junto do exemplo: é como o
jogador vê, por exemplo, o Ativo de um lado e o Passivo e o PL do outro.

Tipos de operação: `subscricao`, `integralizacao`, `deposito`, `compra_imobilizado`,
`compra`, `venda`, `recebimento`, `pagamento`, `devolucao_compra`, `abatimento_compra`,
`devolucao_venda`, `abatimento_venda`, `recebimento_consignacao`, `venda_consignada`,
`devolucao_consignacao`, `inventario_consumo`, `producao`, `provisao_salarios`,
`despesa`, `depreciacao`, `apuracao_icms` e `apuracao_ipi`. Receber e devolver
mercadoria em consignação não geram lançamento.

Os arquivos de missão têm um número na frente do nome (`08-m004-compra-prazo.json`),
que guarda a ordem da campanha.

Só existem os tipos de operação que o motor sabe lançar. Dinheiro vai em centavos
inteiros e percentuais em **pontos-base** (100% = 10000), nunca em fração (ADR-0006).
Na subscrição, `participacoes` traz a parte de cada sócio em pontos-base, somando
10000, com `avatar` e pelo menos mais um sócio NPC:

```jsonc
{ "tipo": "subscricao", "valorCentavos": 30000000, "participacoes": { "avatar": 9000, "osvaldo": 1000 } }
```

Os outros dados ficam em `estabelecimentos.json`, `npcs.json`, `produtos.json` e
`conceitos.json` (`{ id, nome, nivel }`).

## Afirmativa

```jsonc
{
  "id": "af-icms-por-dentro-01",
  "conceitoId": "icms-por-dentro",
  "nivelMin": 3,
  "enunciado": "Na compra de mercadorias para revenda por R$ 3.000,00 com ICMS de 18%, o estoque deve ser registrado por R$ 3.000,00.",
  "gabarito": "E",                           // "C" | "E"
  "explicacao": "O ICMS recuperável não compõe o custo. O estoque entra por R$ 2.460,00, e R$ 540,00 vão para ICMS a Recuperar.",
  "regras": ["R-ICMS-02", "R-ICMS-04", "R-COM-01"],
  "momentos": ["pos_operacao", "revisao"]    // pos_operacao | pre_lancamento | fechamento_mes | fim_nivel | revisao
}
```

### Valores dinâmicos (opcional)

Para ligar a afirmativa à operação real, o enunciado pode usar placeholders
calculados pelo motor: `{{totalNota}}`, `{{icms}}`, `{{custoEstoque}}`, `{{cmv}}`.
O gabarito não pode depender de qual valor foi sorteado. Se depender, crie
afirmativas separadas.

Toda afirmativa com placeholder traz também `exemplo`, com um valor em centavos para
cada placeholder usado. O jogo usa o exemplo quando não há operação por trás (na
Revisão, por exemplo):

```jsonc
"exemplo": { "totalNota": 300000, "icms": 54000, "custoEstoque": 246000 }
```

## Regras de validação

- Toda `regras[]` existe em `regras-contabeis.md` (lista de IDs exportada em config).
- Todo `conceitoId` tem pelo menos 3 afirmativas, com gabaritos C e E misturados.
- Toda missão referencia estabelecimento, NPC, produto e conceitos existentes.
- Todo conceito de uma missão tem ao menos uma afirmativa com `nivelMin` ≤ nível da
  missão (senão a operação nunca teria afirmativa para aquele jogador).
- Placeholders `{{...}}` só podem ser os que o motor calcula.
- `requisitos` não forma ciclo.
- IDs não se repetem; campos desconhecidos são recusados.
