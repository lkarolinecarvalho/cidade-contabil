import { REGRAS } from "@cidade/ledger";
import { z } from "zod";

/** Formato dos dados em `packages/content/data` (docs/modelo-de-conteudo.md). */

const id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id deve ser minúsculo, com palavras separadas por hífen");
const texto = z.string().trim().min(1);
/** Dinheiro em centavos inteiros (ADR-0006). */
const centavos = z.number().int().positive();
const nivel = z.number().int().min(1).max(5);
/** Pontos-base: 100% = 10000; 18% = 1800. Nunca fração em ponto flutuante (ADR-0006). */
const pontosBase = z.number().int().min(0).max(10_000);

export const TOTAL_EM_PONTOS_BASE = 10_000;
/** Id do acionista jogável nas participações (ADR-0007). */
export const ACIONISTA_AVATAR = "avatar";

export const estabelecimentoSchema = z.strictObject({
  id,
  nome: texto,
});

export const npcSchema = z.strictObject({
  id,
  nome: texto,
  papel: texto,
  /** Onde o NPC atende. Ausente para quem só aparece na narrativa. */
  estabelecimento: id.optional(),
});

export const produtoSchema = z.strictObject({
  id,
  nome: texto,
});

export const conceitoSchema = z.strictObject({
  id,
  nome: texto,
  /** Nível em que o conceito é apresentado na campanha. */
  nivel,
  /** Definição curta, mostrada quando o jogador toca no conceito. */
  definicao: texto,
});

/** Tema de teoria do Escritório: pontos curtos, um exemplo da empresa e perguntas. */
export const temaSchema = z.strictObject({
  id,
  titulo: texto,
  resumo: texto,
  pontos: z.array(texto).min(2).max(4),
  exemplo: texto,
  perguntas: z
    .array(z.strictObject({ enunciado: texto, gabarito: z.enum(["C", "E"]), explicacao: texto }))
    .min(1),
});

export const capituloSchema = z.strictObject({
  numero: z.number().int().min(1),
  titulo: texto,
});

const meio = z.enum(["caixa", "bancos"]);

const itemMercadoria = z.strictObject({
  produto: id,
  quantidade: z.number().int().positive(),
  precoUnitarioCentavos: centavos,
});

/** Compra e venda aceitam vários itens na mesma nota (R-NOT-01), sem repetir produto. */
const itensDeMercadoria = z
  .array(itemMercadoria)
  .min(1)
  .refine((itens) => new Set(itens.map((i) => i.produto)).size === itens.length, {
    message: "a nota não pode repetir o mesmo produto",
  });

/** Identificador da nota, para devoluções e abatimentos (ex.: "c1", "v1"). */
const nota = id;

const itensDevolvidos = z
  .array(z.strictObject({ produto: id, quantidade: z.number().int().positive() }))
  .min(1);

const prazo = z.strictObject({
  tipo: z.literal("prazo"),
  dias: z.number().int().positive(),
});

const participacoes = z.record(id, pontosBase.min(1)).superRefine((valor, contexto) => {
  const acionistas = Object.keys(valor);
  const total = Object.values(valor).reduce((soma, parte) => soma + parte, 0);
  if (total !== TOTAL_EM_PONTOS_BASE) {
    contexto.addIssue({
      code: "custom",
      message: `as participações devem somar ${TOTAL_EM_PONTOS_BASE} pontos-base; somam ${total}`,
    });
  }
  // R-CAP-01: a sociedade do jogo tem dois sócios.
  if (acionistas.length < 2) {
    contexto.addIssue({
      code: "custom",
      message: "a sociedade tem pelo menos dois sócios (R-CAP-01)",
    });
  }
  if (!acionistas.includes(ACIONISTA_AVATAR)) {
    contexto.addIssue({ code: "custom", message: `falta o acionista "${ACIONISTA_AVATAR}"` });
  }
});

/**
 * A missão declara a operação, nunca o lançamento (ADR-0005). Só existem aqui as
 * operações que o motor sabe lançar.
 */
export const operacaoSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("subscricao"),
    valorCentavos: centavos,
    /** Parte de cada acionista, em pontos-base (R-CAP-05). */
    participacoes,
  }),
  z.strictObject({ tipo: z.literal("integralizacao"), valorCentavos: centavos, meio }),
  z.strictObject({ tipo: z.literal("deposito"), valorCentavos: centavos }),
  z.strictObject({
    tipo: z.literal("compra_imobilizado"),
    itens: z
      .array(
        z.strictObject({
          classe: z.enum(["terrenos", "edificacoes", "moveis_utensilios", "equipamentos"]),
          valorCentavos: centavos,
        }),
      )
      .min(1),
    meio,
  }),
  z.strictObject({
    tipo: z.literal("compra"),
    itens: itensDeMercadoria,
    /** Alíquota do IPI na oferta do fornecedor, em pontos-base (R-IPI-02). */
    ipiAliquota: pontosBase,
    freteCentavos: z.number().int().min(0),
    condicao: z.discriminatedUnion("tipo", [
      z.strictObject({
        tipo: z.literal("avista"),
        meio: z.enum(["caixa", "bancos", "escolha_do_jogador"]),
      }),
      prazo,
    ]),
    nota: nota.optional(),
    /** R-DSC-01: desconto comercial dado na própria nota, em pontos-base. */
    descontoComercial: pontosBase.optional(),
    /** R-IPI-04: compra para a fábrica; o IPI vira crédito. */
    ipiRecuperavel: z.boolean().optional(),
  }),
  z.strictObject({
    tipo: z.literal("venda"),
    itens: itensDeMercadoria,
    /** R-VEN-01: a venda à vista entra em Caixa. */
    condicao: z.discriminatedUnion("tipo", [z.strictObject({ tipo: z.literal("avista") }), prazo]),
    nota: nota.optional(),
    /** R-DSC-03: desconto incondicional dado na própria nota, em pontos-base. */
    descontoIncondicional: pontosBase.optional(),
    /** R-IPI-05: IPI cobrado por fora, na venda de produto fabricado. */
    ipiAliquota: pontosBase.optional(),
  }),
  z.strictObject({
    tipo: z.literal("recebimento"),
    valorCentavos: centavos,
    meio,
    /** R-DSC-04: desconto concedido por receber antes do vencimento. */
    descontoFinanceiroCentavos: centavos.optional(),
  }),
  z.strictObject({
    tipo: z.literal("pagamento"),
    obrigacao: z.enum(["fornecedores", "salarios", "icms", "ipi"]),
    valorCentavos: centavos,
    meio,
    /** R-DSC-02: desconto obtido por pagar o fornecedor antes do vencimento. */
    descontoFinanceiroCentavos: centavos.optional(),
  }),
  z.strictObject({ tipo: z.literal("devolucao_compra"), nota, itens: itensDevolvidos }),
  z.strictObject({
    tipo: z.literal("abatimento_compra"),
    nota,
    produto: id,
    valorCentavos: centavos,
  }),
  z.strictObject({ tipo: z.literal("devolucao_venda"), nota, itens: itensDevolvidos }),
  z.strictObject({
    tipo: z.literal("abatimento_venda"),
    valorCentavos: centavos,
    contrapartida: z.enum(["clientes", "caixa"]),
  }),
  /** R-CSG-01 e R-CSG-03: não geram lançamento. */
  z.strictObject({
    tipo: z.literal("recebimento_consignacao"),
    produto: id,
    quantidade: z.number().int().positive(),
    precoUnitarioCentavos: centavos,
  }),
  z.strictObject({
    tipo: z.literal("venda_consignada"),
    produto: id,
    quantidade: z.number().int().positive(),
    precoUnitarioCentavos: centavos,
    condicao: z.discriminatedUnion("tipo", [z.strictObject({ tipo: z.literal("avista") }), prazo]),
  }),
  z.strictObject({
    tipo: z.literal("devolucao_consignacao"),
    produto: id,
    quantidade: z.number().int().positive(),
  }),
  /** R-MCO-02: o inventário do material de consumo é dado da missão. */
  z.strictObject({
    tipo: z.literal("inventario_consumo"),
    produto: id,
    quantidadeRestante: z.number().int().min(0),
  }),
  z.strictObject({
    tipo: z.literal("producao"),
    produto: id,
    quantidade: z.number().int().positive(),
  }),
  z.strictObject({ tipo: z.literal("provisao_salarios"), valorCentavos: centavos }),
  z.strictObject({
    tipo: z.literal("despesa"),
    natureza: z.enum(["energia_eletrica"]),
    valorCentavos: centavos,
    meio,
  }),
  /** Depreciação e apuração são do mês corrente do jogo; os valores vêm do motor. */
  z.strictObject({ tipo: z.literal("depreciacao") }),
  z.strictObject({ tipo: z.literal("apuracao_icms") }),
  z.strictObject({ tipo: z.literal("apuracao_ipi") }),
]);

/** Cartão com os dados da operação: os valores ficam aqui, e não nas falas. */
const proposta = z.strictObject({
  titulo: texto,
  linhas: z.array(texto).min(1),
});

export const missaoSchema = z.strictObject({
  id,
  titulo: texto,
  /** Capítulo da campanha. Omitir no modo livre. */
  capitulo: z.number().int().min(1).max(8).optional(),
  nivel,
  estabelecimento: id,
  npc: id,
  /** Missões que precisam estar concluídas antes. */
  requisitos: z.array(id),
  /**
   * Temas de teoria apresentados antes da conversa, na primeira vez: a explicação de
   * que o jogador vai precisar para esta missão.
   */
  aulas: z.array(id).min(1).optional(),
  /** Falas curtas, uma por vez. Os valores da operação ficam em `proposta`. */
  dialogo: z
    .array(z.strictObject({ fala: z.enum(["npc", "jogador"]), texto }))
    .min(1)
    .max(3),
  proposta,
  /** Em ordem. Há operações que não geram lançamento (ex.: R-CSG-01). */
  operacoes: z.array(operacaoSchema),
  ajudaLancamento: z.enum(["auto", "pronto", "contas_sugeridas", "contas_e_valores", "livre"]),
  conceitos: z.array(id).min(1),
  recompensa: z.strictObject({ pontos: z.number().int().min(0) }),
});

/** Placeholders que o motor sabe calcular (`ValoresCalculados` do ledger). */
export type Proposta = z.infer<typeof proposta>;

export const PLACEHOLDERS = [
  "totalNota",
  "ipi",
  "icms",
  "custoEstoque",
  "receitaBruta",
  "pis",
  "cofins",
  "cmv",
] as const;

export const afirmativaSchema = z.strictObject({
  id,
  conceitoId: id,
  nivelMin: nivel,
  enunciado: texto,
  gabarito: z.enum(["C", "E"]),
  explicacao: texto,
  regras: z.array(z.enum(REGRAS)).min(1),
  momentos: z
    .array(z.enum(["pos_operacao", "pre_lancamento", "fechamento_mes", "fim_nivel", "revisao"]))
    .min(1),
  /**
   * Valores de exemplo dos placeholders, em centavos, para quando não há operação
   * por trás (ex.: na Revisão). Obrigatório para cada placeholder usado no texto.
   */
  exemplo: z.partialRecord(z.enum(PLACEHOLDERS), z.number().int().min(0)).optional(),
});

export type Estabelecimento = z.infer<typeof estabelecimentoSchema>;
export type Npc = z.infer<typeof npcSchema>;
export type Produto = z.infer<typeof produtoSchema>;
export type Conceito = z.infer<typeof conceitoSchema>;
export type Capitulo = z.infer<typeof capituloSchema>;
export type Tema = z.infer<typeof temaSchema>;
export type OperacaoDeMissao = z.infer<typeof operacaoSchema>;
export type Missao = z.infer<typeof missaoSchema>;
export type Afirmativa = z.infer<typeof afirmativaSchema>;
