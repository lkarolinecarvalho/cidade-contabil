import type { Catalogo } from "./catalogo";
import type { DataJogo, MesJogo } from "./data";
import type { Centavos, PontosBase } from "./dinheiro";
import type { Parametros } from "./parametros";
import type { ClasseImobilizado, CodigoConta, PlanoDeContas } from "./plano-de-contas";
import type { IdRegra } from "./regras";

export type Lado = "D" | "C";

export interface Partida {
  readonly conta: CodigoConta;
  readonly lado: Lado;
  readonly valorCentavos: Centavos;
}

export type MeioDePagamento = "caixa" | "bancos";

export interface ItemMercadoria {
  readonly produto: string;
  readonly quantidade: number;
  readonly precoUnitarioCentavos: Centavos;
}

export interface ItemImobilizado {
  readonly classe: ClasseImobilizado;
  readonly valorCentavos: Centavos;
}

export type CondicaoDeCompra =
  | { readonly tipo: "avista"; readonly meio: MeioDePagamento }
  | { readonly tipo: "prazo"; readonly dias: number };

/** R-VEN-01: a venda à vista entra em Caixa. */
export type CondicaoDeVenda =
  | { readonly tipo: "avista" }
  | { readonly tipo: "prazo"; readonly dias: number };

export type ObrigacaoPagavel = "fornecedores" | "salarios" | "icms" | "ipi";

/** Item devolvido: o produto e a quantidade, sempre em relação a uma nota registrada. */
export interface ItemDevolvido {
  readonly produto: string;
  readonly quantidade: number;
}

/**
 * Operação de domínio. As missões declaram a operação; os lançamentos são sempre
 * calculados pelo motor (ADR-0005).
 */
export type Operacao =
  | { readonly tipo: "subscricao"; readonly valorCentavos: Centavos }
  | {
      readonly tipo: "integralizacao";
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
    }
  | { readonly tipo: "deposito"; readonly valorCentavos: Centavos }
  | {
      readonly tipo: "compra_imobilizado";
      readonly itens: readonly ItemImobilizado[];
      readonly meio: MeioDePagamento;
    }
  | {
      readonly tipo: "compra";
      readonly itens: readonly ItemMercadoria[];
      readonly ipiAliquota: PontosBase;
      readonly freteCentavos: Centavos;
      readonly condicao: CondicaoDeCompra;
      /** Identificador da nota. Necessário para devolução ou abatimento depois. */
      readonly nota?: string;
      /** R-DSC-01: desconto comercial dado na própria nota. */
      readonly descontoComercial?: PontosBase;
      /** R-IPI-04: compra para a fábrica; o IPI vira crédito. */
      readonly ipiRecuperavel?: boolean;
    }
  | {
      readonly tipo: "venda";
      readonly itens: readonly ItemMercadoria[];
      readonly condicao: CondicaoDeVenda;
      /** Identificador da nota. Necessário para devolução depois. */
      readonly nota?: string;
      /** R-DSC-03: desconto incondicional dado na própria nota. */
      readonly descontoIncondicional?: PontosBase;
      /** R-IPI-05: IPI cobrado por fora, na venda de produto fabricado. */
      readonly ipiAliquota?: PontosBase;
    }
  | {
      readonly tipo: "recebimento";
      /** Valor do título baixado em Clientes. */
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
      /** R-DSC-04: desconto concedido por receber antes do vencimento. */
      readonly descontoFinanceiroCentavos?: Centavos;
    }
  | {
      readonly tipo: "pagamento";
      readonly obrigacao: ObrigacaoPagavel;
      /** Valor da obrigação baixada. */
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
      /** R-DSC-02: desconto obtido por pagar o fornecedor antes do vencimento. */
      readonly descontoFinanceiroCentavos?: Centavos;
    }
  /** R-DVC-01 */
  | {
      readonly tipo: "devolucao_compra";
      readonly nota: string;
      readonly itens: readonly ItemDevolvido[];
    }
  /** R-ABC-01 */
  | {
      readonly tipo: "abatimento_compra";
      readonly nota: string;
      readonly produto: string;
      readonly valorCentavos: Centavos;
    }
  /** R-DVV-01 */
  | {
      readonly tipo: "devolucao_venda";
      readonly nota: string;
      readonly itens: readonly ItemDevolvido[];
    }
  /** R-ABV-01 */
  | {
      readonly tipo: "abatimento_venda";
      readonly valorCentavos: Centavos;
      /** De onde sai o valor: do que o cliente deve ou do caixa. */
      readonly contrapartida: "clientes" | "caixa";
    }
  /** R-CSG-01: recebe mercadoria em consignação. Não gera lançamento. */
  | {
      readonly tipo: "recebimento_consignacao";
      readonly produto: string;
      readonly quantidade: number;
      readonly precoUnitarioCentavos: Centavos;
    }
  /** R-CSG-02: vende item consignado; a compra das unidades é registrada na mesma data. */
  | {
      readonly tipo: "venda_consignada";
      readonly produto: string;
      readonly quantidade: number;
      readonly precoUnitarioCentavos: Centavos;
      readonly condicao: CondicaoDeVenda;
    }
  /** R-CSG-03: devolve ao consignante o que não vendeu. Não gera lançamento. */
  | {
      readonly tipo: "devolucao_consignacao";
      readonly produto: string;
      readonly quantidade: number;
    }
  /** R-MCO-02: inventário do material de consumo no fim do mês. */
  | {
      readonly tipo: "inventario_consumo";
      readonly produto: string;
      readonly quantidadeRestante: number;
    }
  /** R-PRD-01 */
  | { readonly tipo: "producao"; readonly produto: string; readonly quantidade: number }
  /** R-IPI-06 */
  | { readonly tipo: "apuracao_ipi"; readonly mes: MesJogo }
  | { readonly tipo: "provisao_salarios"; readonly valorCentavos: Centavos }
  | {
      readonly tipo: "despesa";
      readonly natureza: "energia_eletrica";
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
    }
  | { readonly tipo: "depreciacao"; readonly mes: MesJogo }
  | { readonly tipo: "apuracao_icms"; readonly mes: MesJogo }
  | { readonly tipo: "encerramento" };

export type TipoOperacao = Operacao["tipo"];

/** Lançamento gravado no razão. Só o motor cria lançamentos (ADR-0005). */
export interface Lancamento {
  readonly id: number;
  readonly data: DataJogo;
  /** "simulacao" só existe na prévia do erro e nunca é gravado no razão. */
  readonly operacao: TipoOperacao | "simulacao";
  readonly historico: string;
  /** Regras de `docs/regras-contabeis.md` que explicam o lançamento. */
  readonly regras: readonly IdRegra[];
  readonly partidas: readonly Partida[];
}

/** Saldo de um produto no inventário permanente (R-EST-01, R-EST-02). */
export interface SaldoDeEstoque {
  readonly quantidade: number;
  /** Valor total em estoque. O custo médio é derivado: valor ÷ quantidade. */
  readonly valorCentavos: Centavos;
}

/** Bem do imobilizado, para o cálculo da depreciação. */
export interface Bem {
  readonly classe: ClasseImobilizado;
  readonly custoCentavos: Centavos;
  /** R-DEP-03: o bem deprecia por mês completo a partir deste mês. */
  readonly emUsoDesde: MesJogo;
}

/** Linha de uma nota registrada, com os valores calculados na operação original. */
export interface LinhaDeNota {
  readonly produto: string;
  readonly quantidade: number;
  /** Quantidade já devolvida desta linha. */
  readonly quantidadeDevolvida: number;
  /** Valor dos produtos, já sem o desconto dado na nota. */
  readonly liquidoCentavos: Centavos;
  readonly ipiCentavos: Centavos;
  readonly freteCentavos: Centavos;
  readonly icmsCentavos: Centavos;
  readonly pisCentavos: Centavos;
  readonly cofinsCentavos: Centavos;
  /** Na compra: custo com que entrou no estoque. Na venda: custo com que saiu. */
  readonly custoCentavos: Centavos;
}

/** Nota de compra ou de venda guardada para devoluções e abatimentos. */
export interface NotaRegistrada {
  readonly tipo: "compra" | "venda";
  readonly aPrazo: boolean;
  /** Na compra à vista: de onde saiu o dinheiro. */
  readonly meio: MeioDePagamento | null;
  readonly ipiRecuperavel: boolean;
  readonly linhas: readonly LinhaDeNota[];
}

/** Mercadoria de terceiros em poder da empresa (R-CSG-01). Fora do patrimônio. */
export interface SaldoConsignado {
  readonly quantidade: number;
  readonly precoUnitarioCentavos: Centavos;
}

/** Estado contábil da empresa. Serializável em JSON. A carteira pessoal não entra (ADR-0004). */
export interface EstadoContabil {
  readonly versaoSchema: 1;
  readonly parametros: Parametros;
  readonly planoDeContas: PlanoDeContas;
  /** Fonte da verdade: saldos e demonstrações são sempre calculados daqui. */
  readonly lancamentos: readonly Lancamento[];
  readonly estoque: Readonly<Record<string, SaldoDeEstoque>>;
  readonly imobilizado: readonly Bem[];
  /** Papel contábil de cada item e as receitas (R-INS-01, R-INS-03, R-PRD-01). */
  readonly catalogo: Catalogo;
  /** Notas com identificador, para devoluções e abatimentos. */
  readonly notas: Readonly<Record<string, NotaRegistrada>>;
  /** Controle à parte das mercadorias recebidas em consignação (R-CSG-01). */
  readonly consignado: Readonly<Record<string, SaldoConsignado>>;
}

/** Valores calculados pelo motor, usados nos placeholders das afirmativas. */
export interface ValoresCalculados {
  readonly totalNota?: Centavos;
  readonly ipi?: Centavos;
  readonly icms?: Centavos;
  readonly custoEstoque?: Centavos;
  readonly receitaBruta?: Centavos;
  readonly pis?: Centavos;
  readonly cofins?: Centavos;
  readonly cmv?: Centavos;
  /** Desconto dado na nota (comercial na compra, incondicional na venda). */
  readonly desconto?: Centavos;
}

export interface Previsao {
  readonly lancamentos: readonly Lancamento[];
  readonly novoEstado: EstadoContabil;
  readonly valores: ValoresCalculados;
}
