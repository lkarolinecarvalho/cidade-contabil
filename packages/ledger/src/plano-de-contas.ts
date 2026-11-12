export type CodigoConta = string;

export type Natureza = "devedora" | "credora";

export type GrupoConta =
  | "ativo_circulante"
  | "imobilizado"
  | "passivo_circulante"
  | "patrimonio_liquido"
  | "receita"
  | "deducao_receita"
  | "custo"
  | "despesa_operacional"
  | "receita_financeira"
  | "despesa_financeira";

export interface Conta {
  readonly codigo: CodigoConta;
  readonly nome: string;
  readonly grupo: GrupoConta;
  readonly natureza: Natureza;
  /** Para contas redutoras do imobilizado: a conta de custo que ela reduz. */
  readonly redutoraDe: CodigoConta | null;
  /**
   * Conta de uso eventual: fica fora do Balanço e da DRE enquanto não tiver movimento.
   * As demais contas aparecem sempre, mesmo zeradas.
   */
  readonly eventual: boolean;
}

export type ClasseImobilizado = "terrenos" | "edificacoes" | "moveis_utensilios" | "equipamentos";

/** Classes que depreciam. Terrenos não depreciam (R-IMO-04, R-DEP-01). */
export type ClasseDepreciavel = Exclude<ClasseImobilizado, "terrenos">;

/** Liga cada papel usado pelo motor a uma conta do plano. */
export interface PapeisDeContas {
  readonly caixa: CodigoConta;
  readonly bancos: CodigoConta;
  readonly clientes: CodigoConta;
  readonly estoque: CodigoConta;
  readonly icmsARecuperar: CodigoConta;
  readonly fornecedores: CodigoConta;
  readonly icmsARecolher: CodigoConta;
  readonly pisARecolher: CodigoConta;
  readonly cofinsARecolher: CodigoConta;
  readonly salariosAPagar: CodigoConta;
  readonly capitalSubscrito: CodigoConta;
  readonly capitalAIntegralizar: CodigoConta;
  readonly lucrosOuPrejuizosAcumulados: CodigoConta;
  readonly receitaBruta: CodigoConta;
  readonly icmsSobreVendas: CodigoConta;
  readonly pisSobreFaturamento: CodigoConta;
  readonly cofinsSobreFaturamento: CodigoConta;
  readonly cmv: CodigoConta;
  readonly despesaSalarios: CodigoConta;
  readonly despesaEnergia: CodigoConta;
  readonly despesaDepreciacao: CodigoConta;
  readonly estoqueInsumos: CodigoConta;
  readonly produtosAcabados: CodigoConta;
  readonly materialDeConsumo: CodigoConta;
  readonly ipiARecuperar: CodigoConta;
  readonly ipiARecolher: CodigoConta;
  readonly devolucoesDeVendas: CodigoConta;
  readonly abatimentosSobreVendas: CodigoConta;
  readonly descontosIncondicionais: CodigoConta;
  readonly cpv: CodigoConta;
  readonly despesaMaterialDeConsumo: CodigoConta;
  readonly descontosFinanceirosObtidos: CodigoConta;
  readonly descontosFinanceirosConcedidos: CodigoConta;
  readonly imobilizado: Readonly<Record<ClasseImobilizado, CodigoConta>>;
  readonly depreciacaoAcumulada: Readonly<Record<ClasseDepreciavel, CodigoConta>>;
}

/** O plano de contas é dado (config), não código fixo, para poder crescer. */
export interface PlanoDeContas {
  readonly contas: readonly Conta[];
  readonly papeis: PapeisDeContas;
}

function conta(
  codigo: CodigoConta,
  nome: string,
  grupo: GrupoConta,
  natureza: Natureza,
  redutoraDe: CodigoConta | null = null,
): Conta {
  return { codigo, nome, grupo, natureza, redutoraDe, eventual: false };
}

/** Conta de uso eventual (ver `Conta.eventual`). */
function eventual(codigo: CodigoConta, nome: string, grupo: GrupoConta, natureza: Natureza): Conta {
  return { codigo, nome, grupo, natureza, redutoraDe: null, eventual: true };
}

/** Plano de contas do jogo (`docs/regras-contabeis.md`, seção 4). */
export const PLANO_DE_CONTAS_V1: PlanoDeContas = {
  contas: [
    conta("1.1.1", "Caixa", "ativo_circulante", "devedora"),
    conta("1.1.2", "Bancos Conta Movimento", "ativo_circulante", "devedora"),
    conta("1.1.3", "Clientes", "ativo_circulante", "devedora"),
    conta("1.1.4", "Estoque de Mercadorias", "ativo_circulante", "devedora"),
    conta("1.1.5", "ICMS a Recuperar", "ativo_circulante", "devedora"),
    eventual("1.1.6", "Estoque de Insumos", "ativo_circulante", "devedora"),
    eventual("1.1.7", "Produtos Acabados", "ativo_circulante", "devedora"),
    eventual("1.1.8", "Material de Consumo", "ativo_circulante", "devedora"),
    eventual("1.1.9", "IPI a Recuperar", "ativo_circulante", "devedora"),
    conta("1.2.3.1", "Terrenos", "imobilizado", "devedora"),
    conta("1.2.3.2", "Edificações", "imobilizado", "devedora"),
    conta("1.2.3.3", "Móveis e Utensílios", "imobilizado", "devedora"),
    conta("1.2.3.4", "Equipamentos", "imobilizado", "devedora"),
    conta(
      "1.2.3.8",
      "(−) Depreciação Acumulada — Edificações",
      "imobilizado",
      "credora",
      "1.2.3.2",
    ),
    conta(
      "1.2.3.9",
      "(−) Depreciação Acumulada — Móveis e Utensílios",
      "imobilizado",
      "credora",
      "1.2.3.3",
    ),
    conta(
      "1.2.3.10",
      "(−) Depreciação Acumulada — Equipamentos",
      "imobilizado",
      "credora",
      "1.2.3.4",
    ),
    conta("2.1.1", "Fornecedores", "passivo_circulante", "credora"),
    conta("2.1.2", "ICMS a Recolher", "passivo_circulante", "credora"),
    conta("2.1.3", "PIS a Recolher", "passivo_circulante", "credora"),
    conta("2.1.4", "COFINS a Recolher", "passivo_circulante", "credora"),
    conta("2.1.5", "Salários a Pagar", "passivo_circulante", "credora"),
    eventual("2.1.6", "IPI a Recolher", "passivo_circulante", "credora"),
    conta("2.3.1", "Capital Social Subscrito", "patrimonio_liquido", "credora"),
    conta("2.3.2", "(−) Capital a Integralizar", "patrimonio_liquido", "devedora"),
    conta("2.3.3", "Lucros ou Prejuízos Acumulados", "patrimonio_liquido", "credora"),
    conta("3.1.1", "Receita Bruta de Vendas", "receita", "credora"),
    conta("3.2.1", "ICMS sobre Vendas", "deducao_receita", "devedora"),
    conta("3.2.2", "PIS sobre Faturamento", "deducao_receita", "devedora"),
    conta("3.2.3", "COFINS sobre Faturamento", "deducao_receita", "devedora"),
    eventual("3.2.4", "Devoluções de Vendas", "deducao_receita", "devedora"),
    eventual("3.2.5", "Abatimentos sobre Vendas", "deducao_receita", "devedora"),
    eventual("3.2.6", "Descontos Incondicionais Concedidos", "deducao_receita", "devedora"),
    eventual("3.3.1", "Descontos Financeiros Obtidos", "receita_financeira", "credora"),
    conta("4.1.1", "Custo das Mercadorias Vendidas (CMV)", "custo", "devedora"),
    eventual("4.1.2", "Custo dos Produtos Vendidos (CPV)", "custo", "devedora"),
    conta("4.2.1", "Despesas com Salários", "despesa_operacional", "devedora"),
    conta("4.2.2", "Despesa com Energia Elétrica", "despesa_operacional", "devedora"),
    conta("4.2.3", "Despesa de Depreciação", "despesa_operacional", "devedora"),
    eventual("4.2.4", "Despesa com Material de Consumo", "despesa_operacional", "devedora"),
    eventual("4.3.1", "Descontos Financeiros Concedidos", "despesa_financeira", "devedora"),
  ],
  papeis: {
    caixa: "1.1.1",
    bancos: "1.1.2",
    clientes: "1.1.3",
    estoque: "1.1.4",
    icmsARecuperar: "1.1.5",
    fornecedores: "2.1.1",
    icmsARecolher: "2.1.2",
    pisARecolher: "2.1.3",
    cofinsARecolher: "2.1.4",
    salariosAPagar: "2.1.5",
    capitalSubscrito: "2.3.1",
    capitalAIntegralizar: "2.3.2",
    lucrosOuPrejuizosAcumulados: "2.3.3",
    receitaBruta: "3.1.1",
    icmsSobreVendas: "3.2.1",
    pisSobreFaturamento: "3.2.2",
    cofinsSobreFaturamento: "3.2.3",
    cmv: "4.1.1",
    despesaSalarios: "4.2.1",
    despesaEnergia: "4.2.2",
    despesaDepreciacao: "4.2.3",
    estoqueInsumos: "1.1.6",
    produtosAcabados: "1.1.7",
    materialDeConsumo: "1.1.8",
    ipiARecuperar: "1.1.9",
    ipiARecolher: "2.1.6",
    devolucoesDeVendas: "3.2.4",
    abatimentosSobreVendas: "3.2.5",
    descontosIncondicionais: "3.2.6",
    cpv: "4.1.2",
    despesaMaterialDeConsumo: "4.2.4",
    descontosFinanceirosObtidos: "3.3.1",
    descontosFinanceirosConcedidos: "4.3.1",
    imobilizado: {
      terrenos: "1.2.3.1",
      edificacoes: "1.2.3.2",
      moveis_utensilios: "1.2.3.3",
      equipamentos: "1.2.3.4",
    },
    depreciacaoAcumulada: {
      edificacoes: "1.2.3.8",
      moveis_utensilios: "1.2.3.9",
      equipamentos: "1.2.3.10",
    },
  },
};

const GRUPOS_DE_RESULTADO: readonly GrupoConta[] = [
  "receita",
  "deducao_receita",
  "custo",
  "despesa_operacional",
  "receita_financeira",
  "despesa_financeira",
];

export function ehContaDeResultado(c: Conta): boolean {
  return GRUPOS_DE_RESULTADO.includes(c.grupo);
}
