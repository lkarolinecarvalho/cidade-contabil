import { type Afirmativa, carregarConteudoDoJogo, type Missao } from "@cidade/content";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { definirVelocidade, type Velocidade } from "../som/narracao";
import { definirSom } from "../som/sons";
import {
  concluirMissao,
  definirModoBanca,
  type EstadoDoJogo,
  encerrarDia,
  executarProximaOperacao,
  fecharMes,
  irParaOUltimoDia,
  liquidarTitulo,
  novoJogo,
  type OpcoesDaOperacao,
  pagarIcms,
  pagarIpi,
  type Resposta,
  registrarResposta,
  registrarTema,
} from "./jogo";

/** Conteúdo validado na carga do app: dado inválido impede o jogo de abrir. */
export const conteudo = carregarConteudoDoJogo();

/** Erros do motor ou do jogo são propagados, e o estado não muda. */
interface Acoes {
  /** Grava no razão a próxima operação pendente da missão. */
  executarProximaOperacao(missao: Missao, opcoes?: OpcoesDaOperacao): void;
  concluirMissao(missao: Missao): void;
  registrarResposta(afirmativa: Afirmativa, resposta: Resposta): void;
  /** Marca um tema de teoria como estudado, com os acertos nas perguntas. */
  registrarTema(tema: string, acertos: number): void;
  definirModoBanca(ligado: boolean): void;
  encerrarDia(): void;
  irParaOUltimoDia(): void;
  fecharMes(): void;
  liquidarTitulo(id: number): void;
  pagarIcms(): void;
  pagarIpi(): void;
  reiniciar(): void;
  /** A abertura terminou (ou foi pulada): o mapa pode ser mostrado inteiro. */
  concluirAbertura(): void;
  /** O jogador dispensou a dica de primeira vez de uma etapa. */
  marcarDica(dica: string): void;
  definirSom(ligado: boolean): void;
  definirVelocidadeDaVoz(velocidade: Velocidade): void;
  definirNarracaoAutomatica(ligada: boolean): void;
}

/** O que a sessão lembra por fora do estado do jogo (não entra no salvamento da partida). */
interface Sessao {
  readonly aberturaVista: boolean;
  readonly dicasVistas: readonly string[];
  /** Efeitos sonoros ligados. */
  readonly somLigado: boolean;
  /** Ritmo da leitura em voz alta. */
  readonly velocidadeDaVoz: Velocidade;
  /** Ler cada fala e cada explicação assim que ela aparece, sem tocar no alto-falante. */
  readonly narracaoAutomatica: boolean;
}

export type JogoStore = EstadoDoJogo & Sessao & Acoes;

/**
 * Store do jogo. É "vanilla" para o Phaser poder ler e assinar sem React;
 * os componentes usam `useJogo`.
 */
export const jogoStore = createStore<JogoStore>()((set, get) => ({
  ...novoJogo(),
  aberturaVista: false,
  dicasVistas: [],
  somLigado: true,
  velocidadeDaVoz: "animada",
  narracaoAutomatica: false,
  definirSom(ligado) {
    definirSom(ligado);
    set({ somLigado: ligado });
  },
  definirVelocidadeDaVoz(velocidade) {
    definirVelocidade(velocidade);
    set({ velocidadeDaVoz: velocidade });
  },
  definirNarracaoAutomatica(ligada) {
    set({ narracaoAutomatica: ligada });
  },
  concluirAbertura() {
    set({ aberturaVista: true });
  },
  marcarDica(dica) {
    if (!get().dicasVistas.includes(dica)) set({ dicasVistas: [...get().dicasVistas, dica] });
  },
  executarProximaOperacao(missao, opcoes) {
    set(executarProximaOperacao(get(), missao, opcoes));
  },
  concluirMissao(missao) {
    set(concluirMissao(get(), missao));
  },
  registrarResposta(afirmativa, resposta) {
    set(registrarResposta(get(), afirmativa, resposta));
  },
  registrarTema(tema, acertos) {
    set(registrarTema(get(), tema, acertos));
  },
  definirModoBanca(ligado) {
    set(definirModoBanca(get(), ligado));
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
  pagarIpi() {
    set(pagarIpi(get()));
  },
  reiniciar() {
    set(novoJogo());
  },
}));

/** Lê um pedaço do estado num componente. O seletor deve devolver valor estável. */
export function useJogo<T>(seletor: (estado: JogoStore) => T): T {
  return useStore(jogoStore, seletor);
}
