import { carregarConteudoDoJogo, type Missao } from "@cidade/content";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  concluirMissao,
  type EstadoDoJogo,
  encerrarDia,
  executarProximaOperacao,
  fecharMes,
  irParaOUltimoDia,
  liquidarTitulo,
  novoJogo,
  type OpcoesDaOperacao,
  pagarIcms,
  registrarResposta,
} from "./jogo";

/** Conteúdo validado na carga do app: dado inválido impede o jogo de abrir. */
export const conteudo = carregarConteudoDoJogo();

/** Erros do motor ou do jogo são propagados, e o estado não muda. */
interface Acoes {
  /** Grava no razão a próxima operação pendente da missão. */
  executarProximaOperacao(missao: Missao, opcoes?: OpcoesDaOperacao): void;
  concluirMissao(missao: Missao): void;
  registrarResposta(afirmativa: string, acertou: boolean): void;
  encerrarDia(): void;
  irParaOUltimoDia(): void;
  fecharMes(): void;
  liquidarTitulo(id: number): void;
  pagarIcms(): void;
  reiniciar(): void;
}

export type JogoStore = EstadoDoJogo & Acoes;

/**
 * Store do jogo. É "vanilla" para o Phaser poder ler e assinar sem React;
 * os componentes usam `useJogo`.
 */
export const jogoStore = createStore<JogoStore>()((set, get) => ({
  ...novoJogo(),
  executarProximaOperacao(missao, opcoes) {
    set(executarProximaOperacao(get(), missao, opcoes));
  },
  concluirMissao(missao) {
    set(concluirMissao(get(), missao));
  },
  registrarResposta(afirmativa, acertou) {
    set(registrarResposta(get(), afirmativa, acertou));
  },
  encerrarDia() {
    set(encerrarDia(get()));
  },
  irParaOUltimoDia() {
    set(irParaOUltimoDia(get()));
  },
  fecharMes() {
    set(fecharMes(get()));
  },
  liquidarTitulo(id) {
    set(liquidarTitulo(get(), id));
  },
  pagarIcms() {
    set(pagarIcms(get()));
  },
  reiniciar() {
    set(novoJogo());
  },
}));

/** Lê um pedaço do estado num componente. O seletor deve devolver valor estável. */
export function useJogo<T>(seletor: (estado: JogoStore) => T): T {
  return useStore(jogoStore, seletor);
}
