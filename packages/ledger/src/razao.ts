import { compararDatas, type DataJogo } from "./data";
import type { Centavos } from "./dinheiro";
import type { CodigoConta, GrupoConta, Natureza, PlanoDeContas } from "./plano-de-contas";
import type { EstadoContabil, Lancamento } from "./tipos";

export interface Movimento {
  readonly debitosCentavos: Centavos;
  readonly creditosCentavos: Centavos;
}

export type Movimentos = ReadonlyMap<CodigoConta, Movimento>;

/** Soma débitos e créditos por conta. O razão é a única fonte dos saldos. */
export function acumularMovimentos(
  lancamentos: readonly Lancamento[],
  incluir: (lancamento: Lancamento) => boolean = () => true,
): Movimentos {
  const movimentos = new Map<CodigoConta, Movimento>();
  for (const lancamento of lancamentos) {
    if (!incluir(lancamento)) continue;
    for (const partida of lancamento.partidas) {
      const atual = movimentos.get(partida.conta) ?? { debitosCentavos: 0, creditosCentavos: 0 };
      movimentos.set(
        partida.conta,
        partida.lado === "D"
          ? { ...atual, debitosCentavos: atual.debitosCentavos + partida.valorCentavos }
          : { ...atual, creditosCentavos: atual.creditosCentavos + partida.valorCentavos },
      );
    }
  }
  return movimentos;
}

/** Débitos − créditos da conta. Positivo = saldo devedor; negativo = saldo credor. */
export function saldoDevedor(movimentos: Movimentos, conta: CodigoConta): Centavos {
  const movimento = movimentos.get(conta);
  return movimento ? movimento.debitosCentavos - movimento.creditosCentavos : 0;
}

/** Créditos − débitos da conta. Positivo = saldo credor. */
export function saldoCredor(movimentos: Movimentos, conta: CodigoConta): Centavos {
  return -saldoDevedor(movimentos, conta);
}

export function ateAData(ate: DataJogo | undefined): (lancamento: Lancamento) => boolean {
  if (!ate) return () => true;
  return (lancamento) => compararDatas(lancamento.data, ate) <= 0;
}

export interface Saldo {
  readonly conta: CodigoConta;
  readonly nome: string;
  readonly grupo: GrupoConta;
  readonly natureza: Natureza;
  readonly debitosCentavos: Centavos;
  readonly creditosCentavos: Centavos;
  /** Saldo no lado da natureza da conta: positivo quando a conta está no lado esperado. */
  readonly saldoCentavos: Centavos;
}

export function saldosDosLancamentos(
  plano: PlanoDeContas,
  lancamentos: readonly Lancamento[],
  ate?: DataJogo,
): Saldo[] {
  const movimentos = acumularMovimentos(lancamentos, ateAData(ate));
  return plano.contas.map((c) => {
    const movimento = movimentos.get(c.codigo) ?? { debitosCentavos: 0, creditosCentavos: 0 };
    const devedor = movimento.debitosCentavos - movimento.creditosCentavos;
    return {
      conta: c.codigo,
      nome: c.nome,
      grupo: c.grupo,
      natureza: c.natureza,
      debitosCentavos: movimento.debitosCentavos,
      creditosCentavos: movimento.creditosCentavos,
      saldoCentavos: c.natureza === "devedora" ? devedor : -devedor,
    };
  });
}

/** Saldo de todas as contas do plano, até a data informada (inclusive). */
export function saldos(estado: EstadoContabil, ate?: DataJogo): Saldo[] {
  return saldosDosLancamentos(estado.planoDeContas, estado.lancamentos, ate);
}

export interface LinhaDoBalancete {
  readonly conta: CodigoConta;
  readonly nome: string;
  readonly saldoDevedorCentavos: Centavos;
  readonly saldoCredorCentavos: Centavos;
}

export interface Balancete {
  readonly linhas: readonly LinhaDoBalancete[];
  readonly totalDevedorCentavos: Centavos;
  readonly totalCredorCentavos: Centavos;
}

/** R-DEM-01: balancete de verificação, com total devedor = total credor. */
export function balancete(estado: EstadoContabil, ate?: DataJogo): Balancete {
  const linhas = saldos(estado, ate).map((saldo) => {
    const devedor = saldo.debitosCentavos - saldo.creditosCentavos;
    return {
      conta: saldo.conta,
      nome: saldo.nome,
      saldoDevedorCentavos: Math.max(devedor, 0),
      saldoCredorCentavos: Math.max(-devedor, 0),
    };
  });
  return {
    linhas,
    totalDevedorCentavos: linhas.reduce((total, l) => total + l.saldoDevedorCentavos, 0),
    totalCredorCentavos: linhas.reduce((total, l) => total + l.saldoCredorCentavos, 0),
  };
}
