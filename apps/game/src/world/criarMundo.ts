import Phaser from "phaser";
import { CenaCidade } from "./CenaCidade";

/** Limita a densidade para não pesar em telas muito densas. */
const DENSIDADE_MAXIMA = 3;

/**
 * Cria o jogo Phaser dentro do elemento do mundo. O canvas é desenhado na densidade
 * de pixels do aparelho (nítido no celular) e acompanha o tamanho do palco.
 */
export function criarMundo(parent: HTMLElement): Phaser.Game {
  const densidade = Math.min(window.devicePixelRatio || 1, DENSIDADE_MAXIMA);
  const tamanho = () => ({
    largura: Math.max(1, Math.round(parent.clientWidth * densidade)),
    altura: Math.max(1, Math.round(parent.clientHeight * densidade)),
  });
  const inicial = tamanho();

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#2f5d50",
    scale: {
      mode: Phaser.Scale.NONE,
      width: inicial.largura,
      height: inicial.altura,
      zoom: 1 / densidade,
    },
    scene: [CenaCidade],
  });

  new ResizeObserver(() => {
    const { largura, altura } = tamanho();
    jogo.scale.resize(largura, altura);
  }).observe(parent);

  return jogo;
}
