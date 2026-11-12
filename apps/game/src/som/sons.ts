/**
 * Efeitos sonoros do jogo, sintetizados na hora com a Web Audio API. Não há arquivos de
 * áudio: cada som é uma sequência curta de notas, então não há licença de terceiros.
 */

export type Som = "toque" | "avanca" | "acerto" | "erro" | "missao" | "moeda";

interface Nota {
  /** Frequência, em hertz. */
  readonly hz: number;
  /** Quando começa, em segundos a partir do início do som. */
  readonly inicio: number;
  readonly duracao: number;
  readonly volume: number;
  readonly onda: OscillatorType;
}

const nota = (
  hz: number,
  inicio: number,
  duracao: number,
  volume = 0.16,
  onda: OscillatorType = "triangle",
): Nota => ({ hz, inicio, duracao, volume, onda });

/** As notas de cada som. Frequências da escala de dó maior, para soar agradável. */
export const PARTITURAS: Readonly<Record<Som, readonly Nota[]>> = {
  toque: [nota(660, 0, 0.05, 0.07, "sine")],
  avanca: [nota(523, 0, 0.06, 0.08), nota(784, 0.05, 0.08, 0.08)],
  acerto: [nota(659, 0, 0.09), nota(784, 0.08, 0.09), nota(1047, 0.16, 0.18)],
  erro: [nota(330, 0, 0.12, 0.13, "sawtooth"), nota(247, 0.11, 0.2, 0.13, "sawtooth")],
  missao: [
    nota(523, 0, 0.11),
    nota(659, 0.1, 0.11),
    nota(784, 0.2, 0.11),
    nota(1047, 0.3, 0.3, 0.18),
    nota(784, 0.3, 0.3, 0.1),
  ],
  moeda: [nota(988, 0, 0.06, 0.12, "square"), nota(1319, 0.06, 0.2, 0.12, "square")],
};

let contexto: AudioContext | null = null;
let ligado = true;

/** Liga ou desliga os efeitos sonoros. */
export function definirSom(valor: boolean): void {
  ligado = valor;
}

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  contexto ??= new window.AudioContext();
  // O navegador só libera o áudio depois de um gesto do usuário.
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

/** Toca um efeito sonoro. Não faz nada se o som estiver desligado ou indisponível. */
export function tocar(som: Som): void {
  if (!ligado) return;
  const audio = obterContexto();
  if (!audio) return;
  const agora = audio.currentTime;
  for (const n of PARTITURAS[som]) {
    const oscilador = audio.createOscillator();
    const ganho = audio.createGain();
    oscilador.type = n.onda;
    oscilador.frequency.value = n.hz;
    // Ataque e queda rápidos, para a nota não estalar.
    ganho.gain.setValueAtTime(0, agora + n.inicio);
    ganho.gain.linearRampToValueAtTime(n.volume, agora + n.inicio + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + n.inicio + n.duracao);
    oscilador.connect(ganho).connect(audio.destination);
    oscilador.start(agora + n.inicio);
    oscilador.stop(agora + n.inicio + n.duracao + 0.02);
  }
}

/** Se o aparelho consegue ler textos em voz alta. */
export function podeFalar(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Lê o texto em voz alta, em português, com a voz do próprio aparelho. */
export function falar(texto: string): void {
  if (!podeFalar()) return;
  const sintese = window.speechSynthesis;
  sintese.cancel();
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  const voz = sintese.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt"));
  if (voz) fala.voice = voz;
  fala.rate = 1;
  sintese.speak(fala);
}

/** Interrompe a leitura em voz alta. */
export function calar(): void {
  if (podeFalar()) window.speechSynthesis.cancel();
}
