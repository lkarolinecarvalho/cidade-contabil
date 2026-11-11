import type { PontosBase } from "./dinheiro";
import type { ClasseDepreciavel } from "./plano-de-contas";

/**
 * Parâmetros tributários e de depreciação. Ficam em config, não no código, para um
 * futuro "modo pós-reforma" e para o Lucro Real (ADR-0002).
 */
export interface Parametros {
  /** R-ICMS-01: alíquota interna única (R-GER-04: um estado, operações internas). */
  readonly icmsAliquota: PontosBase;
  /** R-PC-01: PIS cumulativo. */
  readonly pisAliquota: PontosBase;
  /** R-PC-01: COFINS cumulativa. */
  readonly cofinsAliquota: PontosBase;
  /** R-DEP-01: vida útil estimada, em anos, por classe. */
  readonly vidaUtilAnos: Readonly<Record<ClasseDepreciavel, number>>;
}

export const PARAMETROS_PADRAO: Parametros = {
  icmsAliquota: 1800,
  pisAliquota: 65,
  cofinsAliquota: 300,
  vidaUtilAnos: {
    edificacoes: 25,
    moveis_utensilios: 10,
    equipamentos: 5,
  },
};

/** Regras 📘: simplificações didáticas que a UI deve expor como "nota didática". */
export const NOTAS_DIDATICAS = {
  "R-IMO-06":
    "Nesta versão, a compra de imobilizado não tem ICMS destacado (sem CIAP) e o valor de aquisição já inclui custos como ITBI e registro.",
  "R-DES-03":
    "Nesta versão, os encargos sobre a folha (INSS patronal, FGTS etc.) e as retenções não são calculados.",
  "R-DEP-02": "Nesta versão, o valor residual dos bens é zero.",
  "R-DEP-03": "Nesta versão, o bem deprecia por mês completo a partir do mês em que entra em uso.",
} as const;
