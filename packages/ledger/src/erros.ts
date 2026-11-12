import type { IdRegra } from "./regras";

export type CodigoErro =
  /** Valor, quantidade ou data fora do formato esperado. */
  | "valor_invalido"
  /** Venda acima da quantidade em estoque (R-EST-04). */
  | "estoque_insuficiente"
  /** A operação deixaria Caixa ou Bancos com saldo credor. */
  | "saldo_insuficiente"
  /** Pagamento, recebimento ou integralização acima do saldo da conta baixada. */
  | "excede_saldo"
  /** Nota não encontrada, ou devolução acima do que a nota tem. */
  | "nota_invalida"
  /** Operação repetida no mesmo mês (ex.: depreciação). */
  | "operacao_repetida"
  /** Caso que `docs/regras-contabeis.md` não cobre: o motor não inventa regra. */
  | "caso_nao_coberto";

/** Operação bloqueada pelo motor. O estado nunca é alterado quando ela é lançada. */
export class ErroDeOperacao extends Error {
  readonly codigo: CodigoErro;
  readonly regra: IdRegra | null;

  constructor(codigo: CodigoErro, mensagem: string, regra: IdRegra | null = null) {
    super(mensagem);
    this.name = "ErroDeOperacao";
    this.codigo = codigo;
    this.regra = regra;
  }
}
