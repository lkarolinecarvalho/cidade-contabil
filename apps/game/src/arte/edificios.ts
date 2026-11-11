import { clarear, criarIso, escurecer, type Iso } from "./iso";
import { svg } from "./svg";

/**
 * Tamanho do desenho de cada edifício. A âncora é o centro da base (um quadrado de
 * 6×6 ladrilhos de 10 px de meia largura).
 */
export const DESENHO_DO_EDIFICIO = {
  largura: 160,
  altura: 180,
  ancoraX: 80,
  ancoraY: 132,
} as const;

const UNIDADE = 10;
const LADO = 6;

type Face = "x" | "y";
const ACESO = "#ffd564";
const VIDRO = "#8fd3f0";
const MOLDURA = "#fff6e0";
const MADEIRA = "#9a5f38";

/** Retângulo sobre uma das duas faces visíveis. */
function naFace(
  i: Iso,
  face: Face,
  plano: number,
  inicio: number,
  z: number,
  largura: number,
  altura: number,
  cor: string,
): string {
  return face === "x"
    ? i.faceX(plano, inicio, z, largura, altura, cor)
    : i.faceY(plano, inicio, z, largura, altura, cor);
}

/** Bloco encostado numa face, saindo `profundidade` para fora dela. */
function bloco(
  i: Iso,
  face: Face,
  plano: number,
  inicio: number,
  z: number,
  largura: number,
  profundidade: number,
  altura: number,
  cor: string,
): string {
  return face === "x"
    ? i.caixa(plano, inicio, z, profundidade, largura, altura, cor)
    : i.caixa(inicio, plano, z, largura, profundidade, altura, cor);
}

function janela(
  i: Iso,
  face: Face,
  plano: number,
  inicio: number,
  z: number,
  largura = 1.3,
  altura = 1.3,
  vidro = ACESO,
): string {
  return (
    naFace(i, face, plano, inicio - 0.15, z - 0.15, largura + 0.3, altura + 0.3, MOLDURA) +
    naFace(i, face, plano, inicio, z, largura, altura, vidro) +
    naFace(i, face, plano, inicio, z + altura * 0.55, largura, altura * 0.45, clarear(vidro, 0.3)) +
    naFace(i, face, plano, inicio + largura / 2 - 0.05, z, 0.1, altura, MOLDURA) +
    bloco(i, face, plano, inicio - 0.25, z - 0.35, largura + 0.5, 0.2, 0.2, MOLDURA)
  );
}

function porta(
  i: Iso,
  face: Face,
  plano: number,
  inicio: number,
  largura: number,
  altura: number,
  cor = MADEIRA,
  z = 0,
): string {
  return (
    naFace(i, face, plano, inicio - 0.18, z, largura + 0.36, altura + 0.18, MOLDURA) +
    naFace(i, face, plano, inicio, z, largura, altura, cor) +
    naFace(i, face, plano, inicio + 0.2, z + altura * 0.5, largura - 0.4, altura * 0.38, ACESO) +
    naFace(i, face, plano, inicio + largura - 0.3, z + altura * 0.4, 0.14, 0.14, "#ffe9a8")
  );
}

/** Toldo listrado: cada listra é um bloco, com a barra pendurada na ponta. */
function toldo(
  i: Iso,
  face: Face,
  plano: number,
  inicio: number,
  fim: number,
  z: number,
  profundidade: number,
  cores: readonly [string, string],
): string {
  const listra = 0.5;
  let desenho = "";
  for (let s = inicio, k = 0; s < fim - 0.01; s += listra, k++) {
    const cor = cores[k % 2] as string;
    desenho +=
      bloco(i, face, plano + profundidade - 0.14, s, z - 0.3, listra, 0.14, 0.3, cor) +
      bloco(i, face, plano, s, z, listra, profundidade, 0.25, cor);
  }
  return desenho;
}

function caixote(i: Iso, x: number, y: number, z: number, lado: number): string {
  const cor = "#e8a955";
  const m = lado * 0.18;
  return (
    i.caixa(x, y, z, lado, lado, lado, cor) +
    i.faceX(x + lado, y + m, z + m, lado - 2 * m, lado - 2 * m, clarear(cor, 0.22)) +
    i.faceY(y + lado, x + m, z + m, lado - 2 * m, lado - 2 * m, clarear(cor, 0.22)) +
    i.topo(x + m, y + lado / 2 - 0.08, z + lado, lado - 2 * m, 0.16, escurecer(cor, 0.25))
  );
}

/** Telhado em degraus: lajes cada vez menores, como blocos empilhados. */
function telhadoEmDegraus(i: Iso, z: number, cor: string, degraus: number, beiral = 0.3): string {
  let desenho = "";
  for (let k = 0; k < degraus; k++) {
    const recuo = -beiral + k * 0.85;
    desenho += i.caixa(recuo, recuo, z + k * 0.5, LADO - 2 * recuo, LADO - 2 * recuo, 0.5, cor);
  }
  return desenho;
}

const sombra = (i: Iso) => i.sombra(0.5, 0.5, LADO + 0.4, LADO + 0.4, 0.2);

// Todos os edifícios são desenhados com a fachada da porta na face X (x = 6).

function escritorioContabil(i: Iso): string {
  const azul = "#5a86e0";
  const creme = "#ffe9b5";
  const telhado = "#3f66c4";
  const listras = [azul, "#ffffff"] as const;
  return [
    sombra(i),
    i.caixa(0, 0, 0, LADO, LADO, 2.9, azul),
    janela(i, "x", LADO, 0.6, 1, 1.2, 1.3),
    porta(i, "x", LADO, 2.45, 1.2, 2.1),
    janela(i, "x", LADO, 4.3, 1, 1.2, 1.3),
    janela(i, "y", LADO, 0.9, 1, 1.5, 1.3),
    janela(i, "y", LADO, 3.6, 1, 1.5, 1.3),
    i.caixa(-0.2, -0.2, 2.9, LADO + 0.4, LADO + 0.4, 0.3, "#fff4d8"),
    i.caixa(0, 0, 3.2, LADO, LADO, 2.6, creme),
    janela(i, "x", LADO, 0.7, 3.95, 1.2, 1.3),
    janela(i, "x", LADO, 2.4, 3.95, 1.2, 1.3),
    janela(i, "x", LADO, 4.1, 3.95, 1.2, 1.3),
    janela(i, "y", LADO, 0.9, 3.95, 1.5, 1.3, VIDRO),
    janela(i, "y", LADO, 3.6, 3.95, 1.5, 1.3),
    toldo(i, "x", LADO, 2, 4, 2.4, 1.1, listras),
    i.caixa(-0.3, -0.3, 5.8, LADO + 0.6, LADO + 0.6, 0.45, telhado),
    i.caixa(0.5, 0.5, 6.25, LADO - 1, LADO - 1, 0.25, clarear(telhado, 0.12)),
    i.caixa(1.3, 3.4, 6.5, 1.3, 1.3, 0.7, "#d5dcec"),
  ].join("");
}

function banco(i: Iso): string {
  const pedra = "#f6e7c6";
  const claro = "#fff5dd";
  const colunas = [0.35, 1.6, 3.9, 5.15]
    .map(
      (y) =>
        i.caixa(LADO, y, 0.5, 0.55, 0.55, 3.5, claro) +
        i.caixa(LADO - 0.05, y - 0.08, 0.5, 0.7, 0.7, 0.25, pedra),
    )
    .join("");
  return [
    sombra(i),
    // Escadaria e base.
    i.caixa(LADO + 0.6, 1.9, 0, 0.6, 2.2, 0.25, "#e2d5b6"),
    i.caixa(-0.3, -0.3, 0, LADO + 0.9, LADO + 0.6, 0.5, "#ecdfc0"),
    i.caixa(0, 0, 0.5, LADO, LADO, 3.7, pedra),
    porta(i, "x", LADO, 2.4, 1.2, 2.3, "#8a5a36", 0.5),
    janela(i, "y", LADO, 0.8, 1.5, 1, 2, VIDRO),
    janela(i, "y", LADO, 2.5, 1.5, 1, 2),
    janela(i, "y", LADO, 4.2, 1.5, 1, 2, VIDRO),
    colunas,
    // Entablamento e frontão em degraus.
    i.caixa(-0.3, -0.3, 4.2, LADO + 1, LADO + 0.6, 0.6, claro),
    i.caixa(0.3, 0.3, 4.8, LADO - 0.2, LADO - 0.6, 0.45, pedra),
    i.caixa(1.1, 1.1, 5.25, LADO - 2.2, LADO - 2.2, 0.4, claro),
    i.caixa(1.8, 1.8, 5.65, LADO - 3.6, LADO - 3.6, 0.3, "#7f8fb5"),
    // Moeda no alto da fachada.
    i.caixa(LADO - 0.3, 2.1, 4.9, 0.35, 1.8, 1.8, "#f7b92c"),
    i.faceX(LADO + 0.05, 2.45, 5.25, 1.1, 1.1, "#ffd95e"),
    i.faceX(LADO + 0.05, 2.9, 5.45, 0.2, 0.7, "#c98a12"),
  ].join("");
}

function imobiliaria(i: Iso): string {
  const parede = "#ffe2ad";
  const telhado = "#ec5a4e";
  const listras = [telhado, "#ffffff"] as const;
  return [
    sombra(i),
    i.caixa(0, 0, 0, LADO, LADO, 3.7, parede),
    i.caixa(-0.1, -0.1, 0, LADO + 0.2, LADO + 0.2, 0.5, "#e9a676"),
    janela(i, "x", LADO, 0.6, 1.1, 1.3, 1.4, VIDRO),
    porta(i, "x", LADO, 2.5, 1.2, 2.1),
    janela(i, "x", LADO, 4.2, 1.1, 1.3, 1.4),
    janela(i, "y", LADO, 0.8, 1.2, 1.5, 1.4),
    janela(i, "y", LADO, 3.7, 1.2, 1.5, 1.4, VIDRO),
    toldo(i, "x", LADO, 0.5, 5.5, 2.75, 1.1, listras),
    telhadoEmDegraus(i, 3.7, telhado, 3),
    i.caixa(2.2, 2.2, 5.2, 1.6, 1.6, 0.8, "#f08fb0"),
    // Placa de "vende" na calçada.
    i.caixa(4.65, LADO + 0.65, 0, 0.15, 0.15, 1.2, MADEIRA),
    i.caixa(4, LADO + 0.6, 0.9, 1.4, 0.25, 1, "#ffffff"),
    i.faceY(LADO + 0.85, 4.2, 1.3, 1, 0.35, "#e2483e"),
  ].join("");
}

function postoFiscal(i: Iso): string {
  const parede = "#efe6cf";
  const azul = "#3f6fc9";
  const telhado = "#5f7fc0";
  return [
    sombra(i),
    i.caixa(0, 0, 0, LADO, LADO, 4.3, parede),
    i.caixa(-0.1, -0.1, 0, LADO + 0.2, LADO + 0.2, 0.5, "#cfc4a8"),
    janela(i, "x", LADO, 0.6, 1.1, 1.2, 1.3, VIDRO),
    porta(i, "x", LADO, 2.4, 1.2, 2.1, "#b98a4a"),
    janela(i, "x", LADO, 4.2, 1.1, 1.2, 1.3, VIDRO),
    // Faixa azul da repartição.
    bloco(i, "x", LADO, 0.6, 2.75, 4.8, 0.15, 0.9, azul),
    naFace(i, "x", LADO + 0.15, 1.3, 3.05, 3.4, 0.3, "#ffffff"),
    janela(i, "y", LADO, 0.8, 1.2, 1.4, 1.4),
    janela(i, "y", LADO, 3.7, 1.2, 1.4, 1.4, VIDRO),
    naFace(i, "y", LADO, 0.5, 3.1, 5, 0.35, azul),
    i.caixa(-0.3, -0.3, 4.3, LADO + 0.6, LADO + 0.6, 0.45, telhado),
    i.caixa(0.5, 0.5, 4.75, LADO - 1, LADO - 1, 0.25, clarear(telhado, 0.15)),
    // Mastro com a bandeira.
    i.caixa(0.9, 4.6, 5, 0.18, 0.18, 2.8, "#f2f2f2"),
    i.faceY(4.72, 1.08, 6.5, 1.9, 1.25, "#2f9e4f"),
    i.poligono(
      [
        [1.3, 4.72, 7.12],
        [2.03, 4.72, 7.55],
        [2.76, 4.72, 7.12],
        [2.03, 4.72, 6.7],
      ],
      "#ffd23a",
    ),
    i.faceY(4.72, 1.83, 6.94, 0.4, 0.36, "#2f5fc0"),
  ].join("");
}

function fornecedor(i: Iso): string {
  const parede = "#e0a968";
  const telhado = "#7f8aa3";
  return [
    sombra(i),
    i.caixa(0, 0, 0, LADO, LADO, 3.7, parede),
    // Portão aberto do galpão, com a mercadoria lá dentro.
    naFace(i, "x", LADO, 0.9, 0, 4.2, 2.9, "#fff0cf"),
    naFace(i, "x", LADO, 1.1, 0, 3.8, 2.7, "#5a4038"),
    naFace(i, "x", LADO, 1.3, 0, 1.2, 1.2, "#c98c42"),
    naFace(i, "x", LADO, 2.6, 0, 1, 1.9, "#b87f3a"),
    janela(i, "y", LADO, 0.9, 1.6, 1.6, 1, VIDRO),
    janela(i, "y", LADO, 3.5, 1.6, 1.6, 1, VIDRO),
    i.caixa(-0.3, -0.3, 3.7, LADO + 0.6, LADO + 0.6, 0.45, telhado),
    i.caixa(0.5, 0.5, 4.15, LADO - 1, LADO - 1, 0.35, clarear(telhado, 0.12)),
    i.caixa(1.3, 1.3, 4.5, LADO - 2.6, LADO - 2.6, 0.3, telhado),
    // Caixotes na calçada.
    caixote(i, LADO + 0.3, -0.4, 0, 1.2),
    caixote(i, LADO + 0.45, -0.25, 1.2, 0.9),
    caixote(i, LADO + 1.6, 0.3, 0, 1),
    caixote(i, 0.6, LADO + 0.4, 0, 1.2),
    caixote(i, 2, LADO + 0.5, 0, 1),
  ].join("");
}

function minhaLoja(i: Iso): string {
  const parede = "#fff0c8";
  const telhado = "#e9483f";
  const listras = [telhado, "#ffffff"] as const;
  const vitrine = (inicio: number) =>
    janela(i, "x", LADO, inicio, 0.8, 1.6, 1.5, VIDRO) +
    naFace(i, "x", LADO, inicio + 0.15, 0.8, 0.4, 0.6, "#f29a3a") +
    naFace(i, "x", LADO, inicio + 0.65, 0.8, 0.4, 0.9, "#62b34f") +
    naFace(i, "x", LADO, inicio + 1.1, 0.8, 0.35, 0.5, "#e9483f");
  return [
    sombra(i),
    i.caixa(0, 0, 0, LADO, LADO, 3.8, parede),
    i.caixa(-0.1, -0.1, 0, LADO + 0.2, LADO + 0.2, 0.5, "#f0b27a"),
    vitrine(0.5),
    porta(i, "x", LADO, 2.45, 1.1, 2.1),
    vitrine(3.9),
    janela(i, "y", LADO, 0.8, 1.2, 1.6, 1.5),
    janela(i, "y", LADO, 3.6, 1.2, 1.6, 1.5),
    toldo(i, "x", LADO, 0, 6, 2.8, 1.4, listras),
    toldo(i, "y", LADO, 0.5, 5.5, 2.8, 0.8, listras),
    telhadoEmDegraus(i, 3.8, telhado, 3),
    // Letreiro no alto da fachada.
    i.caixa(LADO - 0.2, 1.4, 4.3, 0.35, 3.2, 1.15, "#ffd564"),
    i.faceX(LADO + 0.15, 1.75, 4.75, 2.5, 0.25, "#ffffff"),
  ].join("");
}

const DESENHOS: Readonly<Record<string, (i: Iso) => string>> = {
  "escritorio-contabil": escritorioContabil,
  banco,
  imobiliaria,
  "posto-fiscal": postoFiscal,
  fornecedor,
  "minha-loja": minhaLoja,
};

/**
 * Desenho do edifício em blocos isométricos. `frente` diz para que lado da tela a
 * fachada com a porta fica virada.
 */
export function desenharEdificio(id: string, frente: "direita" | "esquerda" = "direita"): string {
  const desenho = DESENHOS[id];
  if (!desenho) throw new Error(`Sem desenho para o estabelecimento "${id}".`);
  const { largura, altura, ancoraX, ancoraY } = DESENHO_DO_EDIFICIO;
  const iso = criarIso({
    unidade: UNIDADE,
    // O centro da base (3, 3) cai na âncora.
    origem: { x: ancoraX, y: ancoraY - (LADO * UNIDADE) / 2 },
    espelhado: frente === "esquerda",
  });
  return svg(largura, altura, desenho(iso));
}

export function temDesenhoDeEdificio(id: string): boolean {
  return id in DESENHOS;
}
