import { CONTORNO, svg } from "./svg";

export interface Aparencia {
  readonly pele: string;
  readonly cabelo: string;
  readonly roupa: string;
  /** Avental por cima da roupa. */
  readonly avental?: string;
  readonly calca: string;
  readonly coque?: boolean;
  readonly bone?: string;
  readonly barba?: boolean;
  readonly oculos?: boolean;
  readonly gravata?: string;
}

/** Tamanho do desenho de corpo inteiro; os pés ficam na base, no centro. */
export const PERSONAGEM = { largura: 44, altura: 60 } as const;

const AVATAR: Aparencia = {
  pele: "#f6cfa8",
  cabelo: "#6b3f2a",
  roupa: "#fbf6ea",
  avental: "#4f7a4a",
  calca: "#5b6470",
  coque: true,
};

const PADRAO: Aparencia = {
  pele: "#f1c7a0",
  cabelo: "#4a3728",
  roupa: "#7fa6c9",
  calca: "#5b6470",
};

/** Aparência de cada personagem, pelo id do NPC no conteúdo. */
const APARENCIAS: Readonly<Record<string, Aparencia>> = {
  avatar: AVATAR,
  "marta-contadora": {
    pele: "#e9b98f",
    cabelo: "#2f2a33",
    roupa: "#4f6f9a",
    calca: "#3d4756",
    oculos: true,
    coque: true,
  },
  osvaldo: {
    pele: "#f1c7a0",
    cabelo: "#c9c4bb",
    roupa: "#5a5f6b",
    calca: "#3d4756",
    gravata: "#a8433a",
    oculos: true,
  },
  "helena-gerente": {
    pele: "#c98f64",
    cabelo: "#2b2320",
    roupa: "#3f7f73",
    calca: "#2f3b45",
    gravata: "#f2b632",
  },
  "rui-corretor": {
    pele: "#f1c7a0",
    cabelo: "#a8632f",
    roupa: "#d98c4a",
    calca: "#5b4a3a",
    gravata: "#4a3728",
  },
  "joao-fornecedor": {
    pele: "#f0c39a",
    cabelo: "#5a3a26",
    roupa: "#f3ead6",
    avental: "#4f7a4a",
    calca: "#5b6470",
    bone: "#5d8a52",
    barba: true,
  },
  "bia-funcionaria": {
    pele: "#d9a37a",
    cabelo: "#3a2a22",
    roupa: "#fbf6ea",
    avental: "#c8553f",
    calca: "#5b6470",
    coque: true,
  },
  "lurdes-cliente": { pele: "#f1c7a0", cabelo: "#b9b3ad", roupa: "#b77fb0", calca: "#6b5a70" },
  "antonio-restaurante": {
    pele: "#e2ae84",
    cabelo: "#2f2a26",
    roupa: "#fbfbf8",
    calca: "#3d4756",
    bone: "#fbfbf8",
    barba: true,
  },
  "sergio-fiscal": {
    pele: "#b98058",
    cabelo: "#241f1c",
    roupa: "#4d6485",
    calca: "#2f3b4d",
    gravata: "#243247",
    oculos: true,
  },
};

export function aparenciaDe(id: string): Aparencia {
  return APARENCIAS[id] ?? PADRAO;
}

function corpo(a: Aparencia): string {
  const t = `stroke="${CONTORNO}" stroke-width="1.6" stroke-linejoin="round"`;
  const partes = [
    // Pernas e braços.
    `<rect x="15" y="43" width="6.5" height="13" rx="2.5" fill="${a.calca}" ${t}/>`,
    `<rect x="22.5" y="43" width="6.5" height="13" rx="2.5" fill="${a.calca}" ${t}/>`,
    `<rect x="6.5" y="28" width="7" height="15" rx="3.5" fill="${a.roupa}" ${t}/>`,
    `<rect x="30.5" y="28" width="7" height="15" rx="3.5" fill="${a.roupa}" ${t}/>`,
    `<circle cx="10" cy="43" r="3" fill="${a.pele}" ${t}/>`,
    `<circle cx="34" cy="43" r="3" fill="${a.pele}" ${t}/>`,
    // Tronco.
    `<rect x="11" y="26" width="22" height="21" rx="7" fill="${a.roupa}" ${t}/>`,
  ];
  if (a.gravata) {
    partes.push(`<path d="M22 28 l2.4 3 -2.4 9 -2.4 -9z" fill="${a.gravata}" ${t}/>`);
  }
  if (a.avental) {
    partes.push(
      `<path d="M15 31 h14 v13 a3 3 0 0 1 -3 3 h-8 a3 3 0 0 1 -3 -3z" fill="${a.avental}" ${t}/>`,
      `<path d="M17 31 q5 -6 10 0" fill="none" ${t}/>`,
    );
  }
  return partes.join("");
}

function cabeca(a: Aparencia): string {
  const t = `stroke="${CONTORNO}" stroke-width="1.6" stroke-linejoin="round"`;
  const partes: string[] = [];
  if (a.coque) partes.push(`<circle cx="31.5" cy="6.5" r="5" fill="${a.cabelo}" ${t}/>`);
  partes.push(`<circle cx="22" cy="16" r="11" fill="${a.pele}" ${t}/>`);
  if (a.barba) {
    partes.push(
      `<path d="M11.6 17 q0.6 10.4 10.4 10.4 q9.8 0 10.4 -10.4 q-4 4 -10.4 4 q-6.4 0 -10.4 -4z" fill="${a.cabelo}" ${t}/>`,
    );
  }
  // Cabelo: franja sobre a testa.
  partes.push(
    `<path d="M11 15.5 a11 11 0 0 1 22 0 q-3.5 -5 -11 -5 q-7.5 0 -11 5z" fill="${a.cabelo}" ${t}/>`,
  );
  if (a.bone) {
    partes.push(
      `<path d="M11.2 13 a10.8 10.8 0 0 1 21.6 0z" fill="${a.bone}" ${t}/>`,
      `<path d="M10 13 h17 q5 0 7 3 h-24z" fill="${a.bone}" ${t}/>`,
    );
  }
  // Rosto.
  partes.push(
    `<circle cx="18" cy="17.5" r="1.5" fill="${CONTORNO}"/>`,
    `<circle cx="26" cy="17.5" r="1.5" fill="${CONTORNO}"/>`,
    `<circle cx="15.5" cy="21" r="2" fill="#f08f7a" opacity="0.45"/>`,
    `<circle cx="28.5" cy="21" r="2" fill="#f08f7a" opacity="0.45"/>`,
    `<path d="M19 21.5 q3 2.6 6 0" fill="none" stroke="${a.barba ? "#fbf6ea" : CONTORNO}" stroke-width="1.4" stroke-linecap="round"/>`,
  );
  if (a.oculos) {
    partes.push(
      `<g fill="none" stroke="${CONTORNO}" stroke-width="1.2"><circle cx="18" cy="17.5" r="3.4"/><circle cx="26" cy="17.5" r="3.4"/><path d="M21.4 17.5 h1.2"/></g>`,
    );
  }
  return partes.join("");
}

/** Personagem de corpo inteiro, de frente. */
export function desenharPersonagem(id: string): string {
  const a = aparenciaDe(id);
  return svg(
    PERSONAGEM.largura,
    PERSONAGEM.altura,
    `<ellipse cx="22" cy="56.5" rx="12" ry="3" fill="#000" opacity="0.22"/>${corpo(a)}${cabeca(a)}`,
  );
}

/** Retrato (cabeça e ombros), para o HUD e para os balões de fala. */
export function desenharRetrato(id: string): string {
  const a = aparenciaDe(id);
  return svg(64, 64, `${corpo(a)}${cabeca(a)}`, "2 -2 40 40");
}
