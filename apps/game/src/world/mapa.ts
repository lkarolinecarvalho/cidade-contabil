import { PALCO_REFERENCIA } from "../palco";

/**
 * Geometria do mapa da cidade, sem Phaser: posições, toque → destino e rota do avatar.
 * O mundo usa as coordenadas do viewport de referência (390×844).
 */
export interface Ponto {
  readonly x: number;
  readonly y: number;
}

export interface Edificio {
  /** Id do estabelecimento em `packages/content/data/estabelecimentos.json`. */
  readonly id: string;
  /** Nome curto, para caber na fachada. */
  readonly rotulo: string;
  readonly centro: Ponto;
  readonly cor: number;
  /** Onde o avatar para, na calçada em frente à porta. */
  readonly porta: Ponto;
}

export const MUNDO = {
  largura: PALCO_REFERENCIA.largura,
  altura: PALCO_REFERENCIA.altura,
} as const;
export const EDIFICIO = { largura: 132, altura: 104 } as const;

/** Rua central, por onde o avatar anda. Fica entre o HUD e os atalhos. */
export const RUA = { x: MUNDO.largura / 2, largura: 44, yMin: 168, yMax: 716 } as const;

const COLUNA_ESQUERDA = 92;
const COLUNA_DIREITA = MUNDO.largura - COLUNA_ESQUERDA;
const DISTANCIA_DA_PORTA = 12;

function edificio(id: string, rotulo: string, x: number, y: number, cor: number): Edificio {
  // A porta fica na lateral voltada para a rua central.
  const lado = x < RUA.x ? 1 : -1;
  return {
    id,
    rotulo,
    centro: { x, y },
    cor,
    porta: { x: x + lado * (EDIFICIO.largura / 2 + DISTANCIA_DA_PORTA), y },
  };
}

/** Os 6 estabelecimentos do MVP (ADR-0008). */
export const EDIFICIOS: readonly Edificio[] = [
  edificio("escritorio-contabil", "Escritório\nContábil", COLUNA_ESQUERDA, 232, 0x4a6fa5),
  edificio("banco", "Banco", COLUNA_DIREITA, 232, 0x3f8f7a),
  edificio("imobiliaria", "Imobiliária", COLUNA_ESQUERDA, 442, 0xa5694a),
  edificio("posto-fiscal", "Posto\nFiscal", COLUNA_DIREITA, 442, 0x7a5fa0),
  edificio("fornecedor", "Fornecedor", COLUNA_ESQUERDA, 652, 0x8a8f3f),
  edificio("minha-loja", "Minha Loja", COLUNA_DIREITA, 652, 0xb5527a),
];

/** Onde o avatar começa: na rua, perto do Escritório Contábil. */
export const POSICAO_INICIAL: Ponto = { x: RUA.x, y: 336 };

export function edificioPorId(id: string): Edificio | undefined {
  return EDIFICIOS.find((e) => e.id === id);
}

/** Edifício sob o ponto tocado, se houver. */
export function edificioNoPonto(ponto: Ponto): Edificio | undefined {
  return EDIFICIOS.find(
    (e) =>
      Math.abs(ponto.x - e.centro.x) <= EDIFICIO.largura / 2 &&
      Math.abs(ponto.y - e.centro.y) <= EDIFICIO.altura / 2,
  );
}

export type Destino =
  | { readonly tipo: "estabelecimento"; readonly edificio: Edificio; readonly ponto: Ponto }
  | { readonly tipo: "rua"; readonly ponto: Ponto };

/** Tocar num edifício leva à porta dele; tocar em outro lugar leva ao ponto mais próximo da rua. */
export function destinoDoToque(toque: Ponto): Destino {
  const tocado = edificioNoPonto(toque);
  if (tocado) return { tipo: "estabelecimento", edificio: tocado, ponto: tocado.porta };
  return {
    tipo: "rua",
    ponto: { x: RUA.x, y: Math.min(Math.max(toque.y, RUA.yMin), RUA.yMax) },
  };
}

const mesmoPonto = (a: Ponto, b: Ponto): boolean => a.x === b.x && a.y === b.y;

/**
 * Caminho pela rua central: sai até a rua, anda por ela e entra na calçada do
 * destino. Nunca atravessa um edifício. Devolve os pontos a visitar, em ordem.
 */
export function rotaAte(origem: Ponto, destino: Ponto): Ponto[] {
  if (mesmoPonto(origem, destino)) return [];
  // Mesma altura: a calçada e a rua estão na mesma linha, basta andar em frente.
  if (origem.y === destino.y) return [destino];
  const pontos = [{ x: RUA.x, y: origem.y }, { x: RUA.x, y: destino.y }, destino];
  const rota: Ponto[] = [];
  let anterior = origem;
  for (const ponto of pontos) {
    if (mesmoPonto(ponto, anterior)) continue;
    rota.push(ponto);
    anterior = ponto;
  }
  return rota;
}

export interface Passo {
  readonly posicao: Ponto;
  /** O que ainda falta percorrer. Vazio quando o avatar chegou. */
  readonly rota: readonly Ponto[];
}

/** Avança `distancia` ao longo da rota, parando exatamente no último ponto. */
export function avancar(posicao: Ponto, rota: readonly Ponto[], distancia: number): Passo {
  let atual = posicao;
  let restante = distancia;
  const pendentes = [...rota];
  while (pendentes.length > 0 && restante > 0) {
    const alvo = pendentes[0] as Ponto;
    const dx = alvo.x - atual.x;
    const dy = alvo.y - atual.y;
    const ateOAlvo = Math.hypot(dx, dy);
    if (ateOAlvo <= restante) {
      atual = alvo;
      restante -= ateOAlvo;
      pendentes.shift();
    } else {
      atual = { x: atual.x + (dx / ateOAlvo) * restante, y: atual.y + (dy / ateOAlvo) * restante };
      restante = 0;
    }
  }
  return { posicao: atual, rota: pendentes };
}
