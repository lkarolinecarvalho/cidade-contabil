import Phaser from "phaser";
import { PALCO_REFERENCIA } from "../palco";
import { CenaCidade } from "./CenaCidade";

/** Cria o jogo Phaser dentro do elemento do mundo, acompanhando o tamanho do palco. */
export function criarMundo(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#1d2b3a",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: PALCO_REFERENCIA.largura,
      height: PALCO_REFERENCIA.altura,
    },
    scene: [CenaCidade],
  });
}
