/**
 * Arte do jogo desenhada em SVG, em código. Módulo puro (sem Phaser nem React):
 * o mundo usa os desenhos como texturas e a UI como imagens.
 */

/** Contorno dos desenhos, no estilo de ilustração dos mockups. */
export const CONTORNO = "#4a3728";

export function svg(largura: number, altura: number, corpo: string, viewBox?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="${viewBox ?? `0 0 ${largura} ${altura}`}">${corpo}</svg>`;
}

/** URL `data:` do SVG, para usar em `<img>`. */
export function paraDataUrl(desenho: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(desenho)}`;
}
