import Phaser from "phaser";
import { bus } from "../bus";

/** Cena do mapa da cidade. Vazia por enquanto; o mapa entra no M4. */
export class CenaCidade extends Phaser.Scene {
  constructor() {
    super("cidade");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1d2b3a");

    // Com um painel aberto, os toques são da UI: o mundo para de recebê-los.
    const cancelar = bus.ouvir("painel:mudou", ({ aberto }) => {
      this.input.enabled = !aberto;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cancelar);

    bus.emitir("mundo:pronto", undefined);
  }
}
