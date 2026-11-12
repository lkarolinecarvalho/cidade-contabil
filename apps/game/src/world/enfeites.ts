import type { Enfeite } from "../arte/cenario";
import { type NaGrade, naTela, type Ponto } from "./mapa";

export interface EnfeiteDoMapa {
  readonly tipo: Enfeite;
  /** Posição da base, na tela. */
  readonly ponto: Ponto;
  readonly espelhado?: boolean;
}

/** Enfeite posicionado na grade da planta (os da praça). */
const g = (tipo: Enfeite, grade: NaGrade, espelhado = false): EnfeiteDoMapa => ({
  tipo,
  ponto: naTela(grade),
  espelhado,
});

/** Enfeite posicionado direto na tela (a vizinhança, em volta). */
const t = (tipo: Enfeite, x: number, y: number, espelhado = false): EnfeiteDoMapa => ({
  tipo,
  ponto: { x, y },
  espelhado,
});

/** Fonte, postes, bancos, canteiros, árvores e as casas da vizinhança. */
export const ENFEITES_DO_MAPA: readonly EnfeiteDoMapa[] = [
  // Praça: a fonte no meio, canteiros em volta dela, postes e bancos na borda.
  g("fonte", [0, 0]),
  g("canteiro", [-2.4, -2.4]),
  g("canteiro", [2.4, 2.4], true),
  g("canteiro", [2.4, -2.4], true),
  g("canteiro", [-2.4, 2.4]),
  g("poste", [7.5, -7.5]),
  g("poste", [-7.5, 7.5]),
  g("poste", [-7.4, -2.4]),
  g("banco", [7.7, -2.5]),
  g("banco", [7.7, 1.5]),
  g("banco", [-2.5, 7.7], true),
  g("banco", [1.5, 7.7], true),
  // Entre os edifícios.
  g("arvore", [9.6, -9.6]),
  g("arvore-alta", [-9.6, 9.6]),
  t("barraca", 96, 318),
  // Vizinhança: casas e árvores nas bordas do mapa.
  t("casa-amarela", 92, 236),
  t("casa-rosa", 18, 304),
  t("casa-azul", 360, 262, true),
  t("arvore", 190, 222),
  t("arvore-alta", 286, 226),
  t("arvore-alta", 14, 214),
  t("arvore", 296, 292),
  t("casa-azul", 36, 652),
  t("casa-rosa", 344, 656, true),
  t("casa-amarela", 290, 738),
  t("arvore", 380, 648),
  t("arvore-alta", 374, 592),
  t("arvore", 262, 690),
  t("arvore-alta", 120, 744),
  t("arvore", 192, 724),
  t("arvore-alta", 14, 560),
  t("arvore", 230, 778),
  t("arvore-alta", 350, 750),
  t("arvore", 24, 792),
  t("arvore", 96, 802),
];
