/**
 * Catálogo de itens da empresa: o que cada item é para a contabilidade e as receitas.
 * É dado (config), como o plano de contas.
 */

/** Papel contábil do item (R-INS-01). Item fora do catálogo é mercadoria para revenda. */
export type TipoDeItem = "mercadoria" | "insumo" | "consumo" | "produto_acabado";

export interface IngredienteDaReceita {
  readonly produto: string;
  readonly quantidade: number;
}

export interface Catalogo {
  readonly itens: Readonly<Record<string, TipoDeItem>>;
  /**
   * R-INS-03: produtos preparados na hora da venda. Não têm estoque próprio: cada
   * unidade vendida baixa os insumos da receita.
   */
  readonly receitas: Readonly<Record<string, readonly IngredienteDaReceita[]>>;
  /**
   * R-PRD-01: produtos fabricados para estoque. A operação "produzir" transfere o
   * custo dos insumos para Produtos Acabados.
   */
  readonly fabricacao: Readonly<Record<string, readonly IngredienteDaReceita[]>>;
}

/** Sem catálogo, todo item é mercadoria para revenda (comportamento da v1). */
export const CATALOGO_VAZIO: Catalogo = { itens: {}, receitas: {}, fabricacao: {} };

/** R-INS-01: os itens da hamburgueria. */
export const CATALOGO_DA_HAMBURGUERIA: Catalogo = {
  itens: {
    pao: "insumo",
    carne: "insumo",
    queijo: "insumo",
    alface: "insumo",
    refrigerante: "mercadoria",
    "material-de-limpeza": "consumo",
    // Arco da fábrica.
    embalagem: "insumo",
    "hamburguer-congelado": "produto_acabado",
  },
  receitas: {
    hamburguer: [
      { produto: "pao", quantidade: 1 },
      { produto: "carne", quantidade: 1 },
      { produto: "queijo", quantidade: 1 },
      { produto: "alface", quantidade: 1 },
    ],
  },
  fabricacao: {
    "hamburguer-congelado": [
      { produto: "carne", quantidade: 1 },
      { produto: "embalagem", quantidade: 1 },
    ],
  },
};

export function tipoDoItem(catalogo: Catalogo, produto: string): TipoDeItem {
  return catalogo.itens[produto] ?? "mercadoria";
}
