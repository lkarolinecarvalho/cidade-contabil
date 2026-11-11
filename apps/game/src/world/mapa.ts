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
  /** Nome na placa. */
  readonly rotulo: string;
  readonly centro: Ponto;
  /** Onde o avatar para, na calçada em frente à porta. */
  readonly porta: Ponto;
}

export const MUNDO = {
  largura: PALCO_REFERENCIA.largura,
  altura: PALCO_REFERENCIA.altura,
} as const;

/** Área de toque e de desenho de cada edifício (a fachada, vista de frente). */
export const EDIFICIO = { largura: 150, altura: 130 } as const;

/** Rua central, por onde o avatar anda. Fica entre o HUD e os atalhos. */
export const RUA = { x: MUNDO.largura / 2, largura: 40, yMin: 170, yMax: 742 } as const;

const COLUNA_ESQUERDA = 95;
const COLUNA_DIREITA = MUNDO.largura - COLUNA_ESQUERDA;
/** Distância entre a base da fachada e o ponto em que o avatar para. */
const DISTANCIA_DA_PORTA = 16;

function edificio(id: string, rotulo: string, x: number, y: number): Edificio {
  return {
    id,
    rotulo,
    centro: { x, y },
    // A porta fica na base da fachada, virada para o jogador.
    porta: { x, y: y + EDIFICIO.altura / 2 + DISTANCIA_DA_PORTA },
  };
}

/** Os 6 estabelecimentos do MVP (ADR-0008). */
export const EDIFICIOS: readonly Edificio[] = [
  edificio("escritorio-contabil", "Escritório Contábil", COLUNA_ESQUERDA, 236),
  edificio("banco", "Banco", COLUNA_DIREITA, 236),
  edificio("imobiliaria", "Imobiliária", COLUNA_ESQUERDA, 441),
  edificio("posto-fiscal", "Posto Fiscal", COLUNA_DIREITA, 441),
  edificio("fornecedor", "Fornecedor", COLUNA_ESQUERDA, 646),
  edificio("minha-loja", "Minha Loja", COLUNA_DIREITA, 646),
];

/** Onde o avatar começa: na rua, entre as duas primeiras linhas de prédios. */
export const POSICAO_INICIAL: Ponto = { x: RUA.x, y: 360 };

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
 * Caminho pelas calçadas e pela rua central: vai até a rua, anda por ela e entra na
 * calçada do destino. Nunca atravessa um edifício. Devolve os pontos a visitar, em ordem.
 */
export function rotaAte(origem: Ponto, destino: Ponto): Ponto[] {
  if (mesmoPonto(origem, destino)) return [];
  // Mesma altura: as duas calçadas e a rua estão na mesma linha, basta andar em frente.
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
