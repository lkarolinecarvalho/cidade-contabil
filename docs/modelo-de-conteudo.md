# Modelo de conteúdo

Missões e afirmativas são JSON em `packages/content/data`, validados por schemas zod
em `packages/content/src`. A validação roda nos testes e no build: conteúdo inválido
quebra o CI.

## Missão

A missão descreve **a operação**, nunca o lançamento. O lançamento esperado é
calculado pelo `ledger` a partir da operação (ADR-0005).

```jsonc
{
  "id": "m004-compra-prazo",
  "titulo": "Segunda compra a prazo",
  "capitulo": 4,                             // capítulo da campanha (omitir no modo livre)
  "nivel": 2,
  "estabelecimento": "fornecedor",          // id do estabelecimento no mapa
  "npc": "joao-fornecedor",
  "requisitos": ["m004-compra-avista"],      // missões concluídas antes
  "dialogo": [
    { "fala": "npc", "texto": "Tenho mais 4.000 unidades a R$ 5,00, R$ 20.000,00 no total, com pagamento em 30 dias. Fechamos?" }
  ],
  "operacoes": [{                           // várias operações, em ordem; pode ser [] (fato sem lançamento, R-CAP-02)
    "tipo": "compra",                        // compra | venda | deposito | pagamento | recebimento | subscricao | integralizacao | compra_imobilizado | despesa | provisao_salarios | depreciacao | apuracao_icms
    "itens": [{ "produto": "mercadorias-diversas", "quantidade": 4000, "precoUnitarioCentavos": 500 }], // um produto por nota, por enquanto
    "ipiAliquota": 0,                        // em pontos-base: 10% = 1000
    "freteCentavos": 0,
    "condicao": { "tipo": "prazo", "dias": 30 } // ou { "tipo": "avista", "meio": "caixa" | "bancos" | "escolha_do_jogador" }
  }],
  "ajudaLancamento": "auto",                 // auto (pelo nível) | pronto | contas_sugeridas | livre
  "conceitos": ["icms-por-dentro", "compra-a-prazo-fornecedores", "custo-aquisicao"],
  "recompensa": { "pontos": 80 }
}
```

Só existem os tipos de operação que o motor sabe lançar. Dinheiro vai em centavos
inteiros e percentuais em **pontos-base** (100% = 10000), nunca em fração (ADR-0006).
Na subscrição, `participacoes` traz a parte de cada acionista em pontos-base, somando
10000, com `avatar` e pelo menos mais um acionista NPC:

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
