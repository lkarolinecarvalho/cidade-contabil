/**
 * Primitivas de desenho isométrico em blocos, em SVG. Módulo puro.
 *
 * Eixos lógicos: `x` desce para a direita da tela, `y` desce para a esquerda e `z`
 * sobe. De cada bloco aparecem o topo, a face X (no `x` máximo) e a face Y (no `y`
 * máximo). A luz vem da esquerda: a face do lado esquerdo da tela é a mais clara.
 */

export interface PontoDeTela {
  readonly x: number;
  readonly y: number;
}

const n = (valor: number): string => String(Math.round(valor * 100) / 100);

function canais(cor: string): [number, number, number] {
  const hex = cor.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function paraHex(canaisRgb: readonly number[]): string {
  return `#${canaisRgb
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Mistura a cor com branco. `quanto` de 0 a 1. */
export function clarear(cor: string, quanto: number): string {
  return paraHex(canais(cor).map((c) => c + (255 - c) * quanto));
}

/** Escurece a cor puxando para um marrom-arroxeado, como sombra de ilustração. */
export function escurecer(cor: string, quanto: number): string {
  const sombra = [70, 45, 80];
  return paraHex(canais(cor).map((c, i) => c + ((sombra[i] ?? 0) - c) * quanto));
}

const CLARO_DO_TOPO = 0.2;
/** Tamanho mínimo, em pixels, para um bloco ganhar brilho e sombreamento. */
const DETALHE_MINIMO = 5;

/** Gradientes e filtros usados pelos blocos. Todo SVG com blocos precisa trazê-los. */
export const DEFS_DO_ISO = `<linearGradient id="iso-oclusao" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="#4a2d5e" stop-opacity="0"/><stop offset="1" stop-color="#4a2d5e" stop-opacity="0.26"/></linearGradient><filter id="iso-desfoque" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.3"/></filter>`;

/** Documento SVG de um desenho em blocos, já com os gradientes e filtros. */
export function svgIso(largura: number, altura: number, corpo: string, viewBox?: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="${viewBox ?? `0 0 ${largura} ${altura}`}"><defs>${DEFS_DO_ISO}</defs>${corpo}</svg>`;
}
const ESCURO_DA_DIREITA = 0.2;

export interface Iso {
  /** Projeta um ponto lógico na tela. */
  ponto(x: number, y: number, z: number): PontoDeTela;
  /** Bloco com as três faces visíveis, sombreadas a partir de uma cor. */
  caixa(x: number, y: number, z: number, a: number, b: number, h: number, cor: string): string;
  /** Retângulo sobre o plano `x`, de `y0` a `y0 + largura` e de `z0` a `z0 + altura`. */
  faceX(x: number, y0: number, z0: number, largura: number, altura: number, cor: string): string;
  /** Retângulo sobre o plano `y`, de `x0` a `x0 + largura` e de `z0` a `z0 + altura`. */
  faceY(y: number, x0: number, z0: number, largura: number, altura: number, cor: string): string;
  /** Retângulo horizontal na altura `z`. */
  topo(x: number, y: number, z: number, a: number, b: number, cor: string): string;
  /** Polígono qualquer, de cor chapada. */
  poligono(pontos: readonly (readonly [number, number, number])[], cor: string): string;
  /** Losango de sombra no chão. */
  sombra(x: number, y: number, a: number, b: number, opacidade?: number): string;
}

export interface OpcoesDoIso {
  /** Tamanho, em pixels, de meia largura de um ladrilho. */
  readonly unidade: number;
  /** Onde o ponto lógico (0, 0, 0) cai no desenho. */
  readonly origem: PontoDeTela;
  /** Troca os eixos x e y: o desenho sai espelhado, com a luz no mesmo lado. */
  readonly espelhado?: boolean;
}

export function criarIso({ unidade: u, origem, espelhado = false }: OpcoesDoIso): Iso {
  // Projeção nos eixos reais (já desfeito o espelhamento).
  const real = (x: number, y: number, z: number): PontoDeTela => ({
    x: origem.x + (x - y) * u,
    y: origem.y + ((x + y) * u) / 2 - z * u,
  });
  const ponto = (x: number, y: number, z: number): PontoDeTela =>
    espelhado ? real(y, x, z) : real(x, y, z);
  const forma = (pontos: readonly PontoDeTela[], cor: string, extra = ""): string =>
    `<polygon points="${pontos.map((p) => `${n(p.x)},${n(p.y)}`).join(" ")}" fill="${cor}" stroke="${cor}" stroke-width="0.5" stroke-linejoin="round"${extra}/>`;

  // A face X fica à direita da tela (mais escura), a menos que o desenho esteja espelhado.
  const corDaFaceX = (cor: string) => (espelhado ? cor : escurecer(cor, ESCURO_DA_DIREITA));
  const corDaFaceY = (cor: string) => (espelhado ? escurecer(cor, ESCURO_DA_DIREITA) : cor);

  const faceX: Iso["faceX"] = (x, y0, z0, largura, altura, cor) =>
    forma(
      [
        ponto(x, y0, z0),
        ponto(x, y0 + largura, z0),
        ponto(x, y0 + largura, z0 + altura),
        ponto(x, y0, z0 + altura),
      ],
      corDaFaceX(cor),
    );
  const faceY: Iso["faceY"] = (y, x0, z0, largura, altura, cor) =>
    forma(
      [
        ponto(x0, y, z0),
        ponto(x0 + largura, y, z0),
        ponto(x0 + largura, y, z0 + altura),
        ponto(x0, y, z0 + altura),
      ],
      corDaFaceY(cor),
    );
  const topo: Iso["topo"] = (x, y, z, a, b, cor) =>
    forma([ponto(x, y, z), ponto(x + a, y, z), ponto(x + a, y + b, z), ponto(x, y + b, z)], cor);

  const xy = (p: PontoDeTela) => `${n(p.x)},${n(p.y)}`;
  /** Acabamento do bloco: paredes mais escuras perto do chão e brilho nas quinas. */
  const acabamento = (x: number, y: number, z: number, a: number, b: number, h: number) => {
    const esquerda = ponto(x, y + b, z + h);
    const frente = ponto(x + a, y + b, z + h);
    const direita = ponto(x + a, y, z + h);
    const pe = ponto(x + a, y + b, z);
    let desenho = "";
    if (h * u >= DETALHE_MINIMO) {
      // As duas paredes juntas, do alto até o pé, escurecendo para baixo.
      desenho += `<polygon points="${[esquerda, frente, direita, ponto(x + a, y, z), pe, ponto(x, y + b, z)].map(xy).join(" ")}" fill="url(#iso-oclusao)"/>`;
      desenho += `<path d="M${xy(frente)} L${xy(pe)}" stroke="#fff" stroke-opacity="0.22" stroke-width="0.7" fill="none"/>`;
    }
    if ((a + b) * u >= DETALHE_MINIMO) {
      desenho += `<path d="M${xy(esquerda)} L${xy(frente)} L${xy(direita)}" stroke="#fff" stroke-opacity="0.55" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
    }
    return desenho;
  };

  return {
    ponto,
    faceX,
    faceY,
    topo,
    caixa: (x, y, z, a, b, h, cor) =>
      faceY(y + b, x, z, a, h, cor) +
      faceX(x + a, y, z, b, h, cor) +
      topo(x, y, z + h, a, b, clarear(cor, CLARO_DO_TOPO)) +
      acabamento(x, y, z, a, b, h),
    poligono: (pontos, cor) =>
      forma(
        pontos.map(([x, y, z]) => ponto(x, y, z)),
        cor,
      ),
    sombra: (x, y, a, b, opacidade = 0.16) =>
      forma(
        [ponto(x, y, 0), ponto(x + a, y, 0), ponto(x + a, y + b, 0), ponto(x, y + b, 0)],
        "#3b2a4a",
        ` opacity="${opacidade}" filter="url(#iso-desfoque)"`,
      ),
  };
}
