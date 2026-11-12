import type { Centavos } from "./dinheiro";
import type { CodigoConta } from "./plano-de-contas";
import type { IdRegra } from "./regras";
import type {
  Bem,
  NotaRegistrada,
  Partida,
  SaldoConsignado,
  SaldoDeEstoque,
  ValoresCalculados,
} from "./tipos";

/** Lançamento ainda sem número nem data: o motor completa ao prever. */
export interface Rascunho {
  readonly historico: string;
  readonly regras: readonly IdRegra[];
  readonly partidas: readonly Partida[];
}

/** Resultado do cálculo de uma operação: os lançamentos e o que muda no estado. */
export interface Calculo {
  readonly rascunhos: readonly Rascunho[];
  readonly estoque: Readonly<Record<string, SaldoDeEstoque>>;
  readonly imobilizado: readonly Bem[];
  readonly valores: ValoresCalculados;
  /** Ausentes quando a operação não mexe em notas ou em consignação. */
  readonly notas?: Readonly<Record<string, NotaRegistrada>>;
  readonly consignado?: Readonly<Record<string, SaldoConsignado>>;
}

export const debito = (conta: CodigoConta, valorCentavos: Centavos): Partida => ({
  conta,
  lado: "D",
  valorCentavos,
});

export const credito = (conta: CodigoConta, valorCentavos: Centavos): Partida => ({
  conta,
  lado: "C",
  valorCentavos,
});

/** Monta um lançamento, descartando partidas de valor zero (ex.: ICMS com alíquota 0). */
export function rascunho(
  historico: string,
  regras: readonly IdRegra[],
  partidas: readonly Partida[],
): Rascunho {
  return { historico, regras, partidas: partidas.filter((p) => p.valorCentavos !== 0) };
}

/** Junta partidas da mesma conta e do mesmo lado numa só, na ordem em que aparecem. */
export function agrupar(partidas: readonly Partida[]): Partida[] {
  const grupos = new Map<string, Partida>();
  for (const p of partidas) {
    const chave = `${p.lado}:${p.conta}`;
    const atual = grupos.get(chave);
    grupos.set(
      chave,
      atual ? { ...atual, valorCentavos: atual.valorCentavos + p.valorCentavos } : p,
    );
  }
  return [...grupos.values()];
}
