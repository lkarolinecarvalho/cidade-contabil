import { ErroDeOperacao } from "./erros";

/** Valor monetário em centavos inteiros (ADR-0006, R-GER-02). Nunca use float. */
export type Centavos = number;

/** Alíquota em pontos-base: 18% = 1800; 0,65% = 65. */
export type PontosBase = number;

export function exigirInteiroNaoNegativo(valor: number, nome: string): void {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new ErroDeOperacao(
      "valor_invalido",
      `${nome} deve ser um inteiro não negativo; recebido: ${valor}.`,
      "R-GER-02",
    );
  }
}

export function exigirInteiroPositivo(valor: number, nome: string): void {
  exigirInteiroNaoNegativo(valor, nome);
  if (valor === 0) {
    throw new ErroDeOperacao("valor_invalido", `${nome} deve ser maior que zero.`, "R-GER-02");
  }
}

/**
 * Calcula `a × b ÷ divisor` arredondando meio para cima (R-GER-02).
 * A conta é feita em inteiros (BigInt), sem passar por ponto flutuante.
 */
export function multiplicarEDividir(a: number, b: number, divisor: number): number {
  exigirInteiroNaoNegativo(a, "Fator");
  exigirInteiroNaoNegativo(b, "Fator");
  exigirInteiroPositivo(divisor, "Divisor");
  const numerador = BigInt(a) * BigInt(b);
  const d = BigInt(divisor);
  const resultado = Number((2n * numerador + d) / (2n * d));
  exigirInteiroNaoNegativo(resultado, "Resultado");
  return resultado;
}

/** Tributo de uma linha: base × alíquota, arredondado em centavos (R-GER-02). */
export function aplicarAliquota(base: Centavos, aliquota: PontosBase): Centavos {
  return multiplicarEDividir(base, aliquota, 10_000);
}
