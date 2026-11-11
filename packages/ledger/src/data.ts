import { ErroDeOperacao } from "./erros";

/** Mês do calendário do jogo. */
export interface MesJogo {
  readonly ano: number;
  readonly mes: number;
}

/** Data do calendário do jogo. O tempo sempre entra no motor como parâmetro. */
export interface DataJogo extends MesJogo {
  readonly dia: number;
}

export interface Periodo {
  readonly de: DataJogo;
  readonly ate: DataJogo;
}

export function exigirDataValida(data: DataJogo): void {
  const valida =
    Number.isInteger(data.ano) &&
    Number.isInteger(data.mes) &&
    Number.isInteger(data.dia) &&
    data.ano >= 1 &&
    data.mes >= 1 &&
    data.mes <= 12 &&
    data.dia >= 1 &&
    data.dia <= 31;
  if (!valida) {
    throw new ErroDeOperacao(
      "valor_invalido",
      `Data inválida: ${data.dia}/${data.mes}/${data.ano}.`,
    );
  }
}

function ordinal(data: DataJogo): number {
  return data.ano * 10_000 + data.mes * 100 + data.dia;
}

/** Negativo se `a` vem antes de `b`, zero se são o mesmo dia, positivo se vem depois. */
export function compararDatas(a: DataJogo, b: DataJogo): number {
  return ordinal(a) - ordinal(b);
}

export function mesmoMes(a: MesJogo, b: MesJogo): boolean {
  return a.ano === b.ano && a.mes === b.mes;
}

/** Negativo se o mês `a` vem antes do mês `b`. */
export function compararMeses(a: MesJogo, b: MesJogo): number {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes);
}

export function primeiroDiaDoMes(mes: MesJogo): DataJogo {
  return { ano: mes.ano, mes: mes.mes, dia: 1 };
}
