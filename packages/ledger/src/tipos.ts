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

export type ObrigacaoPagavel = "fornecedores" | "salarios" | "icms";

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
    }
  | {
      readonly tipo: "venda";
      readonly itens: readonly ItemMercadoria[];
      readonly condicao: CondicaoDeVenda;
    }
  | {
      readonly tipo: "recebimento";
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
    }
  | {
      readonly tipo: "pagamento";
      readonly obrigacao: ObrigacaoPagavel;
      readonly valorCentavos: Centavos;
      readonly meio: MeioDePagamento;
    }
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

/** Estado contábil da empresa. Serializável em JSON. A carteira pessoal não entra (ADR-0004). */
export interface EstadoContabil {
  readonly versaoSchema: 1;
  readonly parametros: Parametros;
  readonly planoDeContas: PlanoDeContas;
  /** Fonte da verdade: saldos e demonstrações são sempre calculados daqui. */
  readonly lancamentos: readonly Lancamento[];
  readonly estoque: Readonly<Record<string, SaldoDeEstoque>>;
  readonly imobilizado: readonly Bem[];
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
}

export interface Previsao {
  readonly lancamentos: readonly Lancamento[];
  readonly novoEstado: EstadoContabil;
  readonly valores: ValoresCalculados;
}
