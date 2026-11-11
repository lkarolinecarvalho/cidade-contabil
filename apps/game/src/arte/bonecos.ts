import { criarIso, escurecer } from "./iso";
import { aparenciaDe } from "./personagens";
import { svg } from "./svg";

/** Tamanho do boneco do mapa; a âncora fica entre os pés. */
export const BONECO = { largura: 30, altura: 44, ancoraX: 15, ancoraY: 36 } as const;

const UNIDADE = 4.2;
const OLHO = "#3a2a2a";

/**
 * Personagem em blocos, para o mapa. `olhando` diz para que lado da tela o rosto fica
 * virado. A aparência é a mesma do retrato (`aparenciaDe`).
 */
export function desenharBoneco(id: string, olhando: "direita" | "esquerda" = "direita"): string {
  const a = aparenciaDe(id);
  const i = criarIso({
    unidade: UNIDADE,
    // O meio dos pés (0.7, 1.2) cai na âncora.
    origem: { x: BONECO.ancoraX + 0.5 * UNIDADE, y: BONECO.ancoraY - 0.95 * UNIDADE },
    espelhado: olhando === "esquerda",
  });
  const manga = a.roupa;
  const braco = (y: number) =>
    i.caixa(0.25, y, 2.1, 0.9, 0.6, 0.55, a.pele) + i.caixa(0.25, y, 2.65, 0.9, 0.6, 1.5, manga);

  return svg(
    BONECO.largura,
    BONECO.altura,
    [
      i.sombra(-0.4, -0.4, 2.4, 3.4, 0.22),
      // Pernas e sapatos.
      i.caixa(0.2, 0.1, 0, 1.1, 1, 0.4, "#4a3a3a"),
      i.caixa(0.2, 0.1, 0.4, 1, 1, 1.5, a.calca),
      i.caixa(0.2, 1.3, 0, 1.1, 1, 0.4, "#4a3a3a"),
      i.caixa(0.2, 1.3, 0.4, 1, 1, 1.5, a.calca),
      braco(-0.6),
      // Tronco.
      i.caixa(0, 0, 1.9, 1.4, 2.4, 2.3, a.roupa),
      a.avental ? i.faceX(1.4, 0.4, 1.9, 1.6, 1.9, a.avental) : "",
      a.gravata ? i.faceX(1.4, 1, 2.9, 0.4, 1.3, a.gravata) : "",
      braco(2.4),
      // Cabeça.
      i.caixa(-0.4, -0.15, 4.2, 2.2, 2.7, 2.2, a.pele),
      i.faceX(1.8, 0.35, 5.05, 0.4, 0.5, OLHO),
      i.faceX(1.8, 1.65, 5.05, 0.4, 0.5, OLHO),
      a.oculos ? i.faceX(1.8, 0.2, 5.55, 2, 0.12, OLHO) : "",
      a.barba ? i.faceX(1.8, -0.15, 4.2, 2.7, 0.7, escurecer(a.cabelo, 0.1)) : "",
      // Cabelo: nas laterais e por cima.
      i.faceY(2.55, -0.4, 5.3, 1.3, 1.1, a.cabelo),
      i.faceX(1.8, -0.15, 5.95, 2.7, 0.45, a.cabelo),
      a.bone
        ? i.caixa(-0.5, -0.25, 6.3, 2.4, 2.9, 0.6, a.bone) +
          i.caixa(1.9, 0.2, 6.3, 0.9, 2, 0.2, a.bone)
        : i.caixa(-0.4, -0.15, 6.4, 2.2, 2.7, 0.45, a.cabelo),
      a.coque ? i.caixa(-0.3, 0.6, 6.9, 1.1, 1.1, 0.8, a.cabelo) : "",
    ].join(""),
  );
}
