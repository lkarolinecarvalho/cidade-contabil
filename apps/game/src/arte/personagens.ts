/** Aparência dos personagens. Os desenhos (boneco do mapa e retrato) ficam em `bonecos.ts`. */
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
