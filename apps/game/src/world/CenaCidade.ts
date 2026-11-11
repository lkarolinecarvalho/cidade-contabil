import Phaser from "phaser";

/** Cena do mapa da cidade. Vazia no M0; o mapa entra no M4. */
export class CenaCidade extends Phaser.Scene {
  constructor() {
    super("cidade");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1d2b3a");
  }
}
