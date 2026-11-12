import type { PontosBase } from "./dinheiro";
import type { ClasseDepreciavel } from "./plano-de-contas";

/**
 * Parâmetros tributários e de depreciação. Ficam em config, não no código, para um
 * futuro "modo pós-reforma" e para o Lucro Real (ADR-0002).
 */
export interface Parametros {
  /** R-ICMS-01: alíquota interna única (R-GER-04: um estado, operações internas). */
  readonly icmsAliquota: PontosBase;
  /** R-PC-01: PIS cumulativo. */
  readonly pisAliquota: PontosBase;
  /** R-PC-01: COFINS cumulativa. */
  readonly cofinsAliquota: PontosBase;
  /** R-DEP-01: vida útil estimada, em anos, por classe. */
  readonly vidaUtilAnos: Readonly<Record<ClasseDepreciavel, number>>;
}

export const PARAMETROS_PADRAO: Parametros = {
  icmsAliquota: 1800,
  pisAliquota: 65,
  cofinsAliquota: 300,
  vidaUtilAnos: {
    edificacoes: 25,
    moveis_utensilios: 10,
    equipamentos: 5,
  },
};

/** Regras 📘: simplificações didáticas que a UI deve expor como "nota didática". */
export const NOTAS_DIDATICAS = {
  "R-IMO-06":
    "Nesta versão, a compra de imobilizado não tem ICMS destacado (sem CIAP) e o valor de aquisição já inclui custos como ITBI e registro.",
  "R-DES-03":
    "Nesta versão, os encargos sobre a folha (INSS patronal, FGTS etc.) e as retenções não são calculados.",
  "R-DEP-02": "Nesta versão, o valor residual dos bens é zero.",
  "R-DEP-03": "Nesta versão, o bem deprecia por mês completo a partir do mês em que entra em uso.",
  "R-INS-03":
    "Nesta versão, o custo do lanche é só o dos insumos de uma receita fixa. Numa empresa real, mão de obra e gastos do preparo entram no custo de produção (Contabilidade de Custos).",
  "R-ABC-01": "Nesta versão, o abatimento sobre compras não ajusta o ICMS da nota.",
  "R-DSC-02":
    "Nesta versão, o desconto por pagar antes do vencimento é receita financeira, como as bancas costumam cobrar. Pelo CPC 16, descontos reduzem o custo de aquisição.",
  "R-DSC-04": "Nesta versão, o desconto por receber antes do vencimento é despesa financeira.",
  "R-ABV-01": "Nesta versão, o abatimento sobre vendas não ajusta os tributos nem o estoque.",
  "R-CSG-04":
    "Nesta versão, o ICMS só aparece na compra efetiva e na venda. Na vida real, a remessa em consignação já tem nota com imposto destacado.",
  "R-IPI-07":
    "As alíquotas de IPI do jogo são didáticas. Na TIPI, preparações de carne bovina têm alíquota zero.",
  "R-PRD-01":
    "Nesta versão, o custo do produto fabricado é só o dos insumos da receita. Mão de obra e gastos gerais de fabricação ficam como despesa do período.",
  "R-DID-01":
    "Nas primeiras operações, as notas aparecem pelo valor total, sem impostos destacados, para você treinar o raciocínio básico. Os tributos entram quando a casa cresce.",
  "R-ICMS-09":
    "No jogo, todos os itens seguem o regime normal do ICMS (débito e crédito), com uma alíquota só. Na vida real, refrigerantes costumam estar na substituição tributária, e bares e restaurantes muitas vezes usam regimes especiais, sem crédito.",
} as const;
