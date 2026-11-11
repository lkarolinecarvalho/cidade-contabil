import { criarBus } from "./criarBus";

/** Eventos trocados entre o mundo (Phaser) e a UI (React). */
export interface EventosDoJogo {
  /** React → Phaser: a UI já está ouvindo o bus; o mundo pode ser criado. */
  "ui:pronta": undefined;
  /** Phaser → React: a cena da cidade terminou de carregar. */
  "mundo:pronto": undefined;
  /** React → Phaser: um painel abriu ou fechou; com painel aberto, o mundo não recebe toques. */
  "painel:mudou": { readonly aberto: boolean };
}

/** Único canal entre Phaser e React: um lado nunca importa o outro. */
export const bus = criarBus<EventosDoJogo>();
