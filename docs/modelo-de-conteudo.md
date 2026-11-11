# Modelo de conteúdo

Missões e afirmativas são JSON em `packages/content/data`, validados por schemas zod
em `packages/content/src`. A validação roda nos testes e no build: conteúdo inválido
quebra o CI.

## Missão

A missão descreve **a operação**, nunca o lançamento. O lançamento esperado é
calculado pelo `ledger` a partir da operação (ADR-0005).

```jsonc
{
  "id": "m003-compra-prazo",
  "titulo": "Reabastecendo o estoque",
  "nivel": 2,
  "estabelecimento": "fornecedor",          // id do estabelecimento no mapa
  "npc": "joao-fornecedor",
  "requisitos": ["m001-integralizacao"],           // missões concluídas antes
  "dialogo": [
    { "fala": "npc", "texto": "Tenho um lote de arroz: 100 unidades por R$ 3.000,00, pagamento em 30 dias. Fechamos?" }
  ],
  "operacao": {
    "tipo": "compra",                        // compra | venda | deposito | saque | pagamento | recebimento | integralizacao | apuracao_icms
    "itens": [{ "produto": "arroz-5kg", "quantidade": 100, "precoUnitarioCentavos": 3000 }],
    "ipiAliquota": 0,
    "freteCentavos": 0,
    "condicao": { "tipo": "prazo", "dias": 30 } // ou { "tipo": "avista", "meio": "caixa" | "bancos" | "escolha_do_jogador" }
  },
  "ajudaLancamento": "auto",                 // auto (pelo nível) | pronto | contas_sugeridas | livre
  "conceitos": ["icms-por-dentro", "compra-a-prazo-fornecedores", "custo-aquisicao"],
  "recompensa": { "pontos": 80 }
}
```

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

## Regras de validação

- Toda `regras[]` existe em `regras-contabeis.md` (lista de IDs exportada em config).
- Todo `conceitoId` tem pelo menos 3 afirmativas, com gabaritos C e E misturados.
- Toda missão referencia estabelecimento, NPC e produto existentes.
- `requisitos` não forma ciclo.
