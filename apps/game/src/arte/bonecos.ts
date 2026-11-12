import { clarear, criarIso, escurecer, type Iso, svgIso } from "./iso";
import { type Aparencia, aparenciaDe } from "./personagens";

/** Tamanho do boneco do mapa; a âncora fica entre os pés. */
export const BONECO = { largura: 30, altura: 44, ancoraX: 15, ancoraY: 36 } as const;
/** Tamanho do retrato (cabeça e ombros). */
export const RETRATO = { largura: 64, altura: 64 } as const;

const UNIDADE_NO_MAPA = 4.2;
const UNIDADE_NO_RETRATO = 9.6;
const OLHO = "#3a2a2a";

/** Tronco, braços e cabeça em blocos, com o rosto na face X. */
function busto(i: Iso, a: Aparencia, detalhado: boolean): string {
  const braco = (y: number) =>
    i.caixa(0.25, y, 2.1, 0.9, 0.6, 0.55, a.pele) + i.caixa(0.25, y, 2.65, 0.9, 0.6, 1.5, a.roupa);
  const olho = (y: number) =>
    i.faceX(1.8, y, 5.05, 0.4, 0.5, OLHO) +
    (detalhado ? i.faceX(1.8, y + 0.22, 5.33, 0.16, 0.18, "#ffffff") : "");
  return [
    braco(-0.6),
    i.caixa(0, 0, 1.9, 1.4, 2.4, 2.3, a.roupa),
    a.avental ? i.faceX(1.4, 0.4, 1.9, 1.6, 1.9, a.avental) : "",
    a.gravata ? i.faceX(1.4, 1, 2.9, 0.4, 1.3, a.gravata) : "",
    braco(2.4),
    // Cabeça.
    i.caixa(-0.4, -0.15, 4.2, 2.2, 2.7, 2.2, a.pele),
    olho(0.35),
    olho(1.65),
    detalhado
      ? i.faceX(1.8, 0.02, 4.72, 0.42, 0.26, "#f29a8e") +
        i.faceX(1.8, 1.96, 4.72, 0.42, 0.26, "#f29a8e") +
        i.faceX(1.8, 0.95, 4.62, 0.5, 0.16, escurecer(a.pele, 0.45))
      : "",
    a.oculos ? i.faceX(1.8, 0.2, 5.55, 2, 0.12, OLHO) : "",
    a.barba ? i.faceX(1.8, -0.15, 4.2, 2.7, 0.7, escurecer(a.cabelo, 0.1)) : "",
    // Cabelo: nas laterais, na franja e por cima.
    i.faceY(2.55, -0.4, 5.3, 1.3, 1.1, a.cabelo),
    i.faceX(1.8, -0.15, 5.95, 2.7, 0.45, a.cabelo),
    a.bone
      ? i.caixa(-0.5, -0.25, 6.3, 2.4, 2.9, 0.6, a.bone) +
        i.caixa(1.9, 0.2, 6.3, 0.9, 2, 0.2, clarear(a.bone, 0.1))
      : i.caixa(-0.4, -0.15, 6.4, 2.2, 2.7, 0.45, a.cabelo),
    a.coque ? i.caixa(-0.3, 0.6, 6.85, 1.1, 1.1, 0.8, a.cabelo) : "",
  ].join("");
}

/**
 * Personagem em blocos, para o mapa. `olhando` diz para que lado da tela o rosto fica
 * virado.
 */
export function desenharBoneco(id: string, olhando: "direita" | "esquerda" = "direita"): string {
  const a = aparenciaDe(id);
  const u = UNIDADE_NO_MAPA;
  const i = criarIso({
    unidade: u,
    // O meio dos pés (0.7, 1.2) cai na âncora.
    origem: { x: BONECO.ancoraX + 0.5 * u, y: BONECO.ancoraY - 0.95 * u },
    espelhado: olhando === "esquerda",
  });
  return svgIso(
    BONECO.largura,
    BONECO.altura,
    [
      i.sombra(-0.4, -0.4, 2.4, 3.4, 0.24),
      // Pernas e sapatos.
      i.caixa(0.2, 0.1, 0, 1.1, 1, 0.4, "#4a3a3a"),
      i.caixa(0.2, 0.1, 0.4, 1, 1, 1.5, a.calca),
      i.caixa(0.2, 1.3, 0, 1.1, 1, 0.4, "#4a3a3a"),
      i.caixa(0.2, 1.3, 0.4, 1, 1, 1.5, a.calca),
      busto(i, a, false),
    ].join(""),
  );
}

/** Retrato (cabeça e ombros) no mesmo estilo de blocos, para o HUD e para os diálogos. */
export function desenharRetrato(id: string): string {
  const a = aparenciaDe(id);
  const u = UNIDADE_NO_RETRATO;
  // O meio da cabeça (0.7, 1.2, 5.5) fica um pouco acima do centro do quadro.
  const i = criarIso({
    unidade: u,
    origem: { x: RETRATO.largura / 2 + 0.5 * u - 2, y: RETRATO.altura / 2 + 4.55 * u },
  });
  return svgIso(RETRATO.largura, RETRATO.altura, busto(i, a, true));
}
