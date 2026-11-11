import type { Centavos, DataJogo, MesJogo } from "@cidade/ledger";

/** Todo mês do jogo tem 30 dias (parâmetro de balanceamento). */
export const DIAS_NO_MES = 30;
/** Operações que o jogador pode fazer por dia (GDD, seção 8: sugestão inicial). */
export const ACOES_POR_DIA = 10;

const ordinal = (data: DataJogo): number =>
  (data.ano * 12 + data.mes - 1) * DIAS_NO_MES + data.dia - 1;

/** Negativo se `a` vem antes de `b`. */
export function compararDatas(a: DataJogo, b: DataJogo): number {
  return ordinal(a) - ordinal(b);
}

export function somarDias(data: DataJogo, dias: number): DataJogo {
  const total = ordinal(data) + dias;
  const meses = Math.floor(total / DIAS_NO_MES);
  return { ano: Math.floor(meses / 12), mes: (meses % 12) + 1, dia: (total % DIAS_NO_MES) + 1 };
}

export function ehUltimoDiaDoMes(data: DataJogo): boolean {
  return data.dia === DIAS_NO_MES;
}

export function chaveDoMes(mes: MesJogo): string {
  return `${mes.ano}-${mes.mes}`;
}

export function formatarData(data: DataJogo): string {
  return `dia ${data.dia} do mês ${data.mes}`;
}

/** Título a pagar ou a receber, nascido de uma compra ou venda a prazo. Fica fora do razão. */
export interface Titulo {
  readonly id: number;
  readonly tipo: "pagar" | "receber";
  readonly descricao: string;
  readonly valorCentavos: Centavos;
  /** O que ainda falta pagar ou receber. */
  readonly saldoCentavos: Centavos;
  readonly emissao: DataJogo;
  readonly vencimento: DataJogo;
}

export type SituacaoDoTitulo = "a_vencer" | "vence_hoje" | "vencido";

export function situacaoDoTitulo(titulo: Titulo, hoje: DataJogo): SituacaoDoTitulo {
  const diferenca = compararDatas(titulo.vencimento, hoje);
  if (diferenca < 0) return "vencido";
  return diferenca === 0 ? "vence_hoje" : "a_vencer";
}

/** Títulos com saldo, do vencimento mais próximo para o mais distante. */
export function titulosEmAberto(titulos: readonly Titulo[]): Titulo[] {
  return titulos
    .filter((titulo) => titulo.saldoCentavos > 0)
    .sort((a, b) => compararDatas(a.vencimento, b.vencimento) || a.id - b.id);
}

/** Títulos que pedem atenção: vencem hoje ou já venceram. */
export function titulosEmAlerta(titulos: readonly Titulo[], hoje: DataJogo): Titulo[] {
  return titulosEmAberto(titulos).filter((t) => situacaoDoTitulo(t, hoje) !== "a_vencer");
}

/** Baixa `valor` dos títulos do tipo, começando pelo vencimento mais próximo. */
export function baixarTitulos(
  titulos: readonly Titulo[],
  tipo: Titulo["tipo"],
  valorCentavos: Centavos,
): Titulo[] {
  let restante = valorCentavos;
  const baixas = new Map<number, Centavos>();
  for (const titulo of titulosEmAberto(titulos)) {
    if (titulo.tipo !== tipo || restante === 0) continue;
    const baixa = Math.min(titulo.saldoCentavos, restante);
    baixas.set(titulo.id, baixa);
    restante -= baixa;
  }
  return titulos.map((titulo) => ({
    ...titulo,
    saldoCentavos: titulo.saldoCentavos - (baixas.get(titulo.id) ?? 0),
  }));
}
