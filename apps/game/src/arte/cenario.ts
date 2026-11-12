import {
  clarear,
  criarIso,
  DEFS_DO_ISO,
  escurecer,
  type Iso,
  type PontoDeTela,
  svgIso,
} from "./iso";

type NaGrade = readonly [gx: number, gy: number];

/** Planta do chão, na grade isométrica do mapa. */
export interface PlantaDoChao {
  readonly largura: number;
  readonly altura: number;
  /** Meia largura de um ladrilho, em pixels. */
  readonly unidade: number;
  /** Onde o ponto (0, 0) da grade cai na tela. */
  readonly centro: PontoDeTela;
  /** Trechos de caminho: alinhados à grade ou na diagonal dela (verticais na tela). */
  readonly trechos: readonly (readonly [NaGrade, NaGrade])[];
  /** Meio lado da praça, centrada em (0, 0). */
  readonly raioDaPraca: number;
  /** Centro da base de cada edifício; cada um ganha uma calçada em volta. */
  readonly edificios: readonly NaGrade[];
  readonly ladoDoEdificio: number;
}

const MEIA_LARGURA_DO_CAMINHO = 1.5;
const FOLGA_DA_CALCADA = 1;
/** Meio lado do canteiro central da praça, em volta da fonte. */
const MIOLO_DA_PRACA = 3.4;
/** Deslocamento, na grade, da sombra projetada dos edifícios (para a direita da tela). */
const SOMBRA_PROJETADA: NaGrade = [3, -1.6];

/** Cantos, na grade, da faixa de caminho em volta de um trecho. */
function faixa([a, b]: readonly [NaGrade, NaGrade], w: number): NaGrade[] {
  const [x0, y0] = [Math.min(a[0], b[0]), Math.min(a[1], b[1])];
  const [x1, y1] = [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  if (Math.abs(a[0] - b[0]) < 1e-9 || Math.abs(a[1] - b[1]) < 1e-9) {
    return [
      [x0 - w, y0 - w],
      [x1 + w, y0 - w],
      [x1 + w, y1 + w],
      [x0 - w, y1 + w],
    ];
  }
  // Diagonal da grade: o contorno dos dois quadrados das pontas.
  return [
    [x0 - w, y0 - w],
    [x0 + w, y0 - w],
    [x1 + w, y1 - w],
    [x1 + w, y1 + w],
    [x1 - w, y1 + w],
    [x0 - w, y0 + w],
  ];
}

const quadrado = ([gx, gy]: NaGrade, r: number): NaGrade[] => [
  [gx - r, gy - r],
  [gx + r, gy - r],
  [gx + r, gy + r],
  [gx - r, gy + r],
];

/** Padrão de ladrilhos em losango, em dois tons, alinhado à grade. */
function padrao(id: string, p: PlantaDoChao, ladrilhos: number, a: string, b: string): string {
  const largura = 2 * p.unidade * ladrilhos;
  const altura = largura / 2;
  return `<pattern id="${id}" width="${largura}" height="${altura}" patternUnits="userSpaceOnUse" patternTransform="translate(${p.centro.x - largura / 2} ${p.centro.y})">
    <rect width="${largura}" height="${altura}" fill="${a}"/>
    <path d="M0 ${altura / 2} L${largura / 2} 0 L${largura} ${altura / 2} L${largura / 2} ${altura}z" fill="${b}"/>
  </pattern>`;
}

/** Chão do mapa: gramado, caminhos de ladrilho, calçadas dos edifícios e a praça. */
export function desenharChao(p: PlantaDoChao): string {
  const iso = criarIso({ unidade: p.unidade, origem: p.centro });
  const forma = (cantos: readonly NaGrade[]): string =>
    `<polygon points="${cantos
      .map(([gx, gy]) => {
        const { x, y } = iso.ponto(gx, gy, 0);
        return `${x},${y}`;
      })
      .join(" ")}"/>`;

  const caminhos = p.trechos.map((t) => forma(faixa(t, MEIA_LARGURA_DO_CAMINHO))).join("");
  const calcadas = p.edificios
    .map((e) => forma(quadrado(e, p.ladoDoEdificio / 2 + FOLGA_DA_CALCADA)))
    .join("");
  const praca = forma(quadrado([0, 0], p.raioDaPraca));
  const miolo = forma(quadrado([0, 0], MIOLO_DA_PRACA));
  const piso = caminhos + calcadas + praca;
  // Sombra projetada de cada edifício: a base arrastada para a direita da tela.
  const sombras = p.edificios
    .map(([gx, gy]) => {
      const r = p.ladoDoEdificio / 2;
      const [dx, dy] = SOMBRA_PROJETADA;
      return forma([
        [gx - r, gy + r],
        [gx + r, gy + r],
        [gx + r + dx, gy + r + dy],
        [gx + r + dx, gy - r + dy],
        [gx - r + dx, gy - r + dy],
        [gx - r, gy - r],
      ]);
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.largura}" height="${p.altura}" viewBox="0 0 ${p.largura} ${p.altura}">
    <defs>
      ${DEFS_DO_ISO}
      ${padrao("grama", p, 2, "#86cf5c", "#7dc653")}
      ${padrao("ladrilho", p, 1, "#f7dca4", "#efcd8c")}
      ${padrao("ladrilho-da-praca", p, 1, "#fbd3bc", "#f5c0a4")}
      <filter id="sombra-suave" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <linearGradient id="luz-do-dia" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff6c8" stop-opacity="0.2"/>
        <stop offset="0.55" stop-color="#fff6c8" stop-opacity="0"/>
        <stop offset="1" stop-color="#4a2d5e" stop-opacity="0.12"/>
      </linearGradient>
    </defs>
    <rect width="${p.largura}" height="${p.altura}" fill="url(#grama)"/>
    <g fill="#5fa53f" transform="translate(0 3.5)" stroke="#5fa53f" stroke-width="2" stroke-linejoin="round">${piso}</g>
    <g fill="#d9a968" transform="translate(0 2)">${piso}</g>
    <g fill="url(#ladrilho-da-praca)" stroke="#fde6d6" stroke-width="1.5" stroke-linejoin="round">${praca}</g>
    <g fill="url(#ladrilho)" stroke="#fbe7bd" stroke-width="1" stroke-linejoin="round">${caminhos}${calcadas}</g>
    <g fill="url(#ladrilho)">${caminhos}${calcadas}</g>
    <g fill="url(#ladrilho-da-praca)" stroke="#fde6d6" stroke-width="1" stroke-linejoin="round">${miolo}</g>
    <g fill="#3b2a4a" opacity="0.24" filter="url(#sombra-suave)">${sombras}</g>
    <rect width="${p.largura}" height="${p.altura}" fill="url(#luz-do-dia)"/>
  </svg>`;
}

export type Enfeite =
  | "arvore"
  | "arvore-alta"
  | "poste"
  | "banco"
  | "fonte"
  | "canteiro"
  | "barraca"
  | "casa-rosa"
  | "casa-azul"
  | "casa-amarela";

interface DesenhoDoEnfeite {
  readonly largura: number;
  readonly altura: number;
  /** Ponto do desenho que fica sobre a posição do enfeite no mapa. */
  readonly ancoraX: number;
  readonly ancoraY: number;
  readonly unidade: number;
  readonly desenhar: (i: Iso) => string;
}

const TRONCO = "#9c6238";

function arvore(i: Iso): string {
  const copa = "#2f9a30";
  return [
    i.sombra(-1.3, -1.3, 3.4, 3.4),
    i.caixa(-0.5, -0.5, 0, 1, 1, 2, TRONCO),
    i.caixa(-1.7, -1.7, 2, 3.4, 3.4, 2.1, copa),
    i.caixa(-1.1, -1.1, 4.1, 2.2, 2.2, 1.5, clarear(copa, 0.12)),
    i.caixa(0.2, 0.9, 2.6, 1.2, 1.2, 1.1, clarear(copa, 0.06)),
  ].join("");
}

function arvoreAlta(i: Iso): string {
  const copa = "#258a3a";
  return [
    i.sombra(-1.2, -1.2, 3.2, 3.2),
    i.caixa(-0.5, -0.5, 0, 1, 1, 2.4, TRONCO),
    i.caixa(-1.6, -1.6, 2.4, 3.2, 3.2, 1.7, copa),
    i.caixa(-1.2, -1.2, 4.1, 2.4, 2.4, 1.6, clarear(copa, 0.08)),
    i.caixa(-0.7, -0.7, 5.7, 1.4, 1.4, 1.3, clarear(copa, 0.18)),
  ].join("");
}

function poste(i: Iso): string {
  const ferro = "#3d4257";
  const lampada = i.ponto(0, 0, 5.1);
  return [
    i.sombra(-0.5, -0.5, 1.2, 1.2),
    `<circle cx="${lampada.x}" cy="${lampada.y}" r="13" fill="#ffe27a" opacity="0.3"/>`,
    i.caixa(-0.45, -0.45, 0, 0.9, 0.9, 0.4, ferro),
    i.caixa(-0.18, -0.18, 0.4, 0.36, 0.36, 4.1, ferro),
    i.caixa(-0.55, -0.55, 4.5, 1.1, 1.1, 0.2, ferro),
    i.caixa(-0.45, -0.45, 4.7, 0.9, 0.9, 1, "#ffe07a"),
    i.caixa(-0.65, -0.65, 5.7, 1.3, 1.3, 0.25, ferro),
  ].join("");
}

function banco(i: Iso): string {
  const madeira = "#c98845";
  return [
    i.sombra(-1.5, -0.4, 3.4, 1.4),
    i.caixa(-1.7, -0.6, 0.5, 3.4, 0.25, 1.1, madeira),
    i.caixa(-1.5, 0.3, 0, 0.3, 0.3, 0.5, "#6b4a35"),
    i.caixa(1.2, 0.3, 0, 0.3, 0.3, 0.5, "#6b4a35"),
    i.caixa(-1.7, -0.35, 0.5, 3.4, 1, 0.25, clarear(madeira, 0.1)),
  ].join("");
}

function fonte(i: Iso): string {
  const pedra = "#ece4d8";
  const agua = "#63cdf2";
  return [
    i.sombra(-2, -2, 4.6, 4.6),
    i.caixa(-2.2, -2.2, 0, 4.4, 4.4, 0.8, pedra),
    i.topo(-1.8, -1.8, 0.82, 3.6, 3.6, agua),
    i.topo(-1.8, -1.8, 0.82, 3.6, 0.5, escurecer(agua, 0.12)),
    i.topo(-1.8, -1.8, 0.82, 0.5, 3.6, escurecer(agua, 0.12)),
    i.caixa(-0.6, -0.6, 0.8, 1.2, 1.2, 1.3, pedra),
    i.caixa(-1.2, -1.2, 2.1, 2.4, 2.4, 0.5, pedra),
    i.topo(-0.95, -0.95, 2.62, 1.9, 1.9, agua),
    // Água caindo e o jato.
    i.faceX(1.2, -0.45, 0.82, 0.9, 1.5, "#b6ecfc"),
    i.faceY(1.2, -0.45, 0.82, 0.9, 1.5, "#c9f2fd"),
    i.caixa(-0.3, -0.3, 2.6, 0.6, 0.6, 1.3, "#c4f0fd"),
    i.caixa(-0.5, -0.5, 3.9, 1, 1, 0.3, "#e3f9ff"),
  ].join("");
}

function canteiro(i: Iso): string {
  const folha = "#4fae4b";
  const flor = (x: number, y: number, cor: string) => i.caixa(x, y, 0.9, 0.45, 0.45, 0.4, cor);
  return [
    i.sombra(-1.5, -0.5, 3.3, 1.5),
    i.caixa(-1.6, -0.7, 0, 3.2, 1.4, 0.9, folha),
    flor(-1.3, -0.5, "#ff8fb3"),
    flor(-0.4, 0, "#ffd84a"),
    flor(0.4, -0.5, "#ffffff"),
    flor(1, 0.1, "#ff8fb3"),
  ].join("");
}

function barraca(i: Iso): string {
  const listras = ["#ec5a4e", "#ffffff"];
  const toldo = Array.from({ length: 6 }, (_, k) =>
    i.caixa(-1.7 + k * 0.6, -1.3, 2.6, 0.6, 2.6, 0.3, listras[k % 2] as string),
  ).join("");
  return [
    i.sombra(-1.5, -1, 3.6, 2.6),
    i.caixa(-1.5, -1.1, 0, 0.2, 0.2, 2.6, TRONCO),
    i.caixa(1.5, -1.1, 0, 0.2, 0.2, 2.6, TRONCO),
    i.caixa(-1.6, -0.9, 0, 3.2, 1.8, 1.1, "#c98845"),
    i.caixa(-1.4, -0.7, 1.1, 0.8, 0.8, 0.5, "#ff9a3a"),
    i.caixa(-0.4, -0.7, 1.1, 0.8, 0.8, 0.5, "#62b34f"),
    i.caixa(0.6, -0.7, 1.1, 0.8, 0.8, 0.5, "#ec5a4e"),
    i.caixa(-0.9, 0.2, 1.1, 0.8, 0.6, 0.4, "#ffd84a"),
    i.caixa(0.1, 0.2, 1.1, 0.8, 0.6, 0.4, "#ff9a3a"),
    i.caixa(-1.5, 0.9, 0, 0.2, 0.2, 2.6, TRONCO),
    i.caixa(1.5, 0.9, 0, 0.2, 0.2, 2.6, TRONCO),
    toldo,
  ].join("");
}

/** Casa da vizinhança: só cenário, sem porta para o jogador entrar. */
function casa(parede: string, telhado: string): (i: Iso) => string {
  const janela = (i: Iso, face: "x" | "y", inicio: number) => {
    const desenhar = face === "x" ? i.faceX : i.faceY;
    return (
      desenhar(2, inicio - 0.12, 0.88, 1.14, 1.14, "#fff6e0") +
      desenhar(2, inicio, 1, 0.9, 0.9, "#ffd564")
    );
  };
  return (i) =>
    [
      i.sombra(-1.6, -1.6, 4.4, 4.4, 0.2),
      i.caixa(-2, -2, 0, 4, 4, 2.6, parede),
      janela(i, "x", -1.5),
      i.faceX(2, 0.2, 0, 1, 1.7, "#fff6e0"),
      i.faceX(2, 0.32, 0, 0.76, 1.55, "#9a5f38"),
      janela(i, "y", -1.4),
      janela(i, "y", 0.5),
      i.caixa(-2.3, -2.3, 2.6, 4.6, 4.6, 0.45, telhado),
      i.caixa(-1.5, -1.5, 3.05, 3, 3, 0.45, telhado),
      i.caixa(-0.8, -0.8, 3.5, 1.6, 1.6, 0.4, telhado),
    ].join("");
}

const CASA = { largura: 100, altura: 96, ancoraX: 50, ancoraY: 66, unidade: 10 } as const;

/** Árvores, postes, bancos e demais enfeites: cada um é um desenho à parte no mapa. */
export const ENFEITES: Readonly<Record<Enfeite, DesenhoDoEnfeite>> = {
  arvore: { largura: 56, altura: 76, ancoraX: 28, ancoraY: 60, unidade: 7, desenhar: arvore },
  "arvore-alta": {
    largura: 52,
    altura: 86,
    ancoraX: 26,
    ancoraY: 72,
    unidade: 7,
    desenhar: arvoreAlta,
  },
  poste: { largura: 30, altura: 50, ancoraX: 15, ancoraY: 42, unidade: 6, desenhar: poste },
  banco: { largura: 48, altura: 38, ancoraX: 24, ancoraY: 24, unidade: 6, desenhar: banco },
  fonte: { largura: 72, altura: 64, ancoraX: 36, ancoraY: 42, unidade: 6.5, desenhar: fonte },
  canteiro: { largura: 44, altura: 34, ancoraX: 22, ancoraY: 20, unidade: 6, desenhar: canteiro },
  barraca: { largura: 64, altura: 64, ancoraX: 32, ancoraY: 42, unidade: 7, desenhar: barraca },
  "casa-rosa": { ...CASA, desenhar: casa("#ffc7c2", "#b56bb0") },
  "casa-azul": { ...CASA, desenhar: casa("#cfe6ff", "#4f7fd0") },
  "casa-amarela": { ...CASA, desenhar: casa("#ffe9a6", "#e2703a") },
};

export function desenharEnfeite(tipo: Enfeite, espelhado = false): string {
  const e = ENFEITES[tipo];
  const iso = criarIso({
    unidade: e.unidade,
    origem: { x: e.ancoraX, y: e.ancoraY },
    espelhado,
  });
  return svgIso(e.largura, e.altura, e.desenhar(iso));
}
