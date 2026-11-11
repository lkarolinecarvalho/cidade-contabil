import {
  type Centavos,
  exigirInteiroNaoNegativo,
  exigirInteiroPositivo,
  multiplicarEDividir,
} from "./dinheiro";
import { ErroDeOperacao } from "./erros";
import type { SaldoDeEstoque } from "./tipos";

export const ESTOQUE_VAZIO: SaldoDeEstoque = { quantidade: 0, valorCentavos: 0 };

/**
 * R-EST-01, R-EST-02: a entrada soma quantidade e valor; o custo médio ponderado
 * móvel é derivado (valor ÷ quantidade) e nunca é guardado arredondado.
 */
export function entradaNoEstoque(
  saldo: SaldoDeEstoque,
  quantidade: number,
  valorCentavos: Centavos,
): SaldoDeEstoque {
  exigirInteiroPositivo(quantidade, "Quantidade");
  exigirInteiroNaoNegativo(valorCentavos, "Valor da entrada");
  return {
    quantidade: saldo.quantidade + quantidade,
    valorCentavos: saldo.valorCentavos + valorCentavos,
  };
}

export interface SaidaDoEstoque {
  readonly saldo: SaldoDeEstoque;
  readonly cmvCentavos: Centavos;
}

/**
 * R-EST-03: CMV = round(valorEmEstoque × qtdSaida ÷ qtdEmEstoque). Quando a saída
 * zera a quantidade, o CMV é o valor restante inteiro.
 * R-EST-04: saída acima da quantidade em estoque é bloqueada.
 */
export function saidaDoEstoque(saldo: SaldoDeEstoque, quantidade: number): SaidaDoEstoque {
  exigirInteiroPositivo(quantidade, "Quantidade");
  if (quantidade > saldo.quantidade) {
    throw new ErroDeOperacao(
      "estoque_insuficiente",
      `Quantidade em estoque insuficiente: há ${saldo.quantidade} un. e a saída é de ${quantidade} un.`,
      "R-EST-04",
    );
  }
  const cmvCentavos =
    quantidade === saldo.quantidade
      ? saldo.valorCentavos
      : multiplicarEDividir(saldo.valorCentavos, quantidade, saldo.quantidade);
  return {
    saldo: {
      quantidade: saldo.quantidade - quantidade,
      valorCentavos: saldo.valorCentavos - cmvCentavos,
    },
    cmvCentavos,
  };
}
