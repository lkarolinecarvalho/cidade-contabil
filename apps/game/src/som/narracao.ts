/**
 * Narração dos textos com a voz do próprio aparelho (Web Speech), sem arquivos de áudio.
 * Para a leitura soar menos mecânica: o texto é preparado para a fala (valores em reais,
 * siglas, sinais de conta), é lido frase por frase, e o tom varia com a pontuação.
 */

/** Ritmo da leitura, escolhido nas Configurações. */
export type Velocidade = "calma" | "animada" | "acelerada";

export const RITMO: Readonly<Record<Velocidade, number>> = {
  calma: 1,
  animada: 1.18,
  acelerada: 1.35,
};

export const VELOCIDADES: readonly (readonly [Velocidade, string])[] = [
  ["calma", "Calma"],
  ["animada", "Animada"],
  ["acelerada", "Acelerada"],
];

/** Tom de base, um pouco acima do neutro, para a voz soar mais alegre. */
const TOM = 1.12;

/** Siglas que a voz deve soletrar. As demais (IPI, PIS, COFINS) são lidas como palavra. */
const SOLETRADAS: Readonly<Record<string, string>> = {
  ICMS: "I C M S",
  CMV: "C M V",
  CPV: "C P V",
  DRE: "D R E",
};

function valorEmReais(inteiros: string, centavos: string): string {
  const reais = Number(inteiros.replaceAll(".", ""));
  const cents = Number(centavos);
  const parteDosReais = reais === 1 ? "1 real" : `${reais} reais`;
  const parteDosCentavos = cents === 1 ? "1 centavo" : `${cents} centavos`;
  if (reais === 0) return parteDosCentavos;
  return cents === 0 ? parteDosReais : `${parteDosReais} e ${parteDosCentavos}`;
}

/** Reescreve o texto do jeito que uma pessoa o leria em voz alta. */
export function prepararParaFala(texto: string): string {
  return (
    texto
      // "R$ 1.560,00" → "1560 reais"; "R$ 94,50" → "94 reais e 50 centavos".
      .replace(
        /R\$\s?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})/g,
        (_, inteiros: string, centavos: string) => valorEmReais(inteiros, centavos),
      )
      // Milhar sem "R$": "1.560" → "1560", para a voz não ler "um ponto quinhentos e sessenta".
      .replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2")
      .replace(/\(−\)/g, "menos")
      .replace(/\s[−-]\s(?=\d)/g, " menos ")
      .replace(/\s\+\s/g, " mais ")
      .replace(/\s=\s/g, " é igual a ")
      .replace(/\s×\s/g, " vezes ")
      .replace(/\s÷\s/g, " dividido por ")
      .replace(/\bLtda\./g, "Limitada")
      .replace(/\b(ICMS|CMV|CPV|DRE)\b/g, (sigla: string) => SOLETRADAS[sigla] ?? sigla)
      .replace(/[›‹]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Divide o texto em frases, mantendo a pontuação final de cada uma. */
export function frasesDe(texto: string): string[] {
  return (texto.match(/[^.!?:]+[.!?:]*/g) ?? [])
    .map((frase) => frase.trim())
    .filter((frase) => /[\p{L}\d]/u.test(frase));
}

/** Tom e ritmo de uma frase: a pergunta sobe, a exclamação anima, o resto alterna de leve. */
export function entonacao(
  frase: string,
  indice: number,
  ritmo: number,
): { readonly tom: number; readonly ritmo: number } {
  if (frase.endsWith("?")) return { tom: TOM + 0.16, ritmo };
  if (frase.endsWith("!")) return { tom: TOM + 0.1, ritmo: ritmo + 0.05 };
  // Frases seguidas no mesmo tom soam robóticas: uma oscilação pequena já ajuda.
  return { tom: TOM + (indice % 2 === 0 ? 0.03 : -0.04), ritmo };
}

/** O que importa de uma voz do aparelho para escolhê-la. */
export interface VozDisponivel {
  readonly name: string;
  readonly lang: string;
  readonly localService?: boolean;
}

/** Nota de uma voz: português do Brasil primeiro, e as vozes "naturais" na frente. */
export function notaDaVoz(voz: VozDisponivel): number {
  const idioma = voz.lang.toLowerCase().replace("_", "-");
  if (!idioma.startsWith("pt")) return -1;
  let nota = idioma === "pt-br" ? 10 : 2;
  // Vozes neurais dos navegadores e sistemas soam bem mais naturais que as antigas.
  if (/natural|neural|online|premium|enhanced|aprimorad/i.test(voz.name)) nota += 6;
  if (/google/i.test(voz.name)) nota += 4;
  if (/francisca|thalita|luciana|let[ií]cia|fernanda/i.test(voz.name)) nota += 2;
  return nota;
}

export function escolherVoz<T extends VozDisponivel>(vozes: readonly T[]): T | undefined {
  return [...vozes]
    .filter((voz) => notaDaVoz(voz) >= 0)
    .sort((a, b) => notaDaVoz(b) - notaDaVoz(a))[0];
}

// ---------------------------------------------------------------------------
// Reprodução
// ---------------------------------------------------------------------------

let velocidade: Velocidade = "animada";
/** Texto que está sendo lido agora, ou `null`. */
let emLeitura: string | null = null;
const ouvintes = new Set<() => void>();

function mudar(texto: string | null): void {
  if (emLeitura === texto) return;
  emLeitura = texto;
  for (const ouvinte of ouvintes) ouvinte();
}

export function definirVelocidade(nova: Velocidade): void {
  velocidade = nova;
}

/**
 * A narração está desligada no jogo até os textos e as regras estarem definidos. O
 * código fica pronto: basta ligar aqui para os botões de ouvir e as opções voltarem.
 */
export const NARRACAO_DISPONIVEL: boolean = false;

/** Se o jogo oferece narração e o aparelho consegue ler textos em voz alta. */
export function podeFalar(): boolean {
  return NARRACAO_DISPONIVEL && typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Texto em leitura, para os botões de ouvir saberem se são eles que estão tocando. */
export function textoEmLeitura(): string | null {
  return emLeitura;
}

export function assinarLeitura(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/** Lê o texto em voz alta, do começo, interrompendo o que estiver tocando. */
export function falar(texto: string): void {
  if (!podeFalar()) return;
  const sintese = window.speechSynthesis;
  sintese.cancel();
  const voz = escolherVoz(sintese.getVoices());
  const frases = frasesDe(prepararParaFala(texto));
  if (frases.length === 0) return;
  mudar(texto);
  frases.forEach((frase, indice) => {
    const fala = new SpeechSynthesisUtterance(frase);
    fala.lang = "pt-BR";
    if (voz) fala.voice = voz;
    const { tom, ritmo } = entonacao(frase, indice, RITMO[velocidade]);
    fala.pitch = tom;
    fala.rate = ritmo;
    if (indice === frases.length - 1) {
      // Só a leitura que ainda é a atual pode encerrar o estado.
      const encerrar = () => {
        if (emLeitura === texto) mudar(null);
      };
      fala.onend = encerrar;
      fala.onerror = encerrar;
    }
    sintese.speak(fala);
  });
}

/** Interrompe a leitura em voz alta. Com um texto, só interrompe se for ele que toca. */
export function calar(texto?: string): void {
  if (texto !== undefined && emLeitura !== texto) return;
  if (podeFalar()) window.speechSynthesis.cancel();
  mudar(null);
}
