import { carregarConteudoDoJogo, type Missao } from "@cidade/content";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { concluirMissao, type EstadoDoJogo, novoJogo, type OpcoesDaOperacao } from "./jogo";

/** Conteúdo validado na carga do app: dado inválido impede o jogo de abrir. */
export const conteudo = carregarConteudoDoJogo();

interface Acoes {
  /** Conclui a missão. Erros do motor ou do jogo são propagados, e o estado não muda. */
  concluirMissao(missao: Missao, opcoes?: OpcoesDaOperacao): void;
  reiniciar(): void;
}

export type JogoStore = EstadoDoJogo & Acoes;

/**
 * Store do jogo. É "vanilla" para o Phaser poder ler e assinar sem React;
 * os componentes usam `useJogo`.
 */
export const jogoStore = createStore<JogoStore>()((set, get) => ({
  ...novoJogo(),
  concluirMissao(missao, opcoes) {
    set(concluirMissao(get(), missao, opcoes));
  },
  reiniciar() {
    set(novoJogo());
  },
}));

/** Lê um pedaço do estado num componente. O seletor deve devolver valor estável. */
export function useJogo<T>(seletor: (estado: JogoStore) => T): T {
  return useStore(jogoStore, seletor);
}
