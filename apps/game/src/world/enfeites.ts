import type { Enfeite } from "../arte/cenario";
import type { Ponto } from "./mapa";

export interface EnfeiteDoMapa {
  readonly tipo: Enfeite;
  /** Posição da base, na tela. */
  readonly ponto: Ponto;
  readonly espelhado?: boolean;
}

const em = (tipo: Enfeite, x: number, y: number, espelhado = false): EnfeiteDoMapa => ({
  tipo,
  ponto: { x, y },
  espelhado,
});

/** Árvores, postes, bancos e canteiros do mapa. Ficam fora dos caminhos. */
export const ENFEITES_DO_MAPA: readonly EnfeiteDoMapa[] = [
  em("fonte", 195, 462),
  // Em volta da praça e ao longo da avenida.
  em("poste", 155, 414),
  em("poste", 235, 414),
  em("poste", 155, 512),
  em("poste", 235, 512),
  em("banco", 148, 378, true),
  em("banco", 242, 378),
  em("banco", 148, 566, true),
  em("banco", 242, 566),
  em("canteiro", 152, 346),
  em("canteiro", 238, 346, true),
  em("canteiro", 152, 606),
  em("canteiro", 238, 606, true),
  em("arvore", 132, 420),
  em("arvore-alta", 260, 424),
  em("arvore-alta", 134, 540),
  em("arvore", 258, 536),
  // Alto do mapa, entre o Escritório e o Banco.
  em("barraca", 195, 252),
  em("arvore", 158, 208),
  em("arvore-alta", 232, 204),
  em("arvore-alta", 14, 196),
  em("arvore", 378, 200),
  // Bordas.
  em("arvore", 16, 356),
  em("arvore-alta", 376, 352),
  em("arvore-alta", 18, 566),
  em("arvore", 374, 560),
  em("arvore", 150, 748),
  em("arvore-alta", 242, 752),
  em("arvore-alta", 22, 742),
  em("arvore", 368, 738),
  em("arvore", 70, 790),
  em("arvore-alta", 318, 794),
  em("arvore", 195, 800),
];
