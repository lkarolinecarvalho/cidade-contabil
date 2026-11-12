import { PALCO_REFERENCIA } from "../palco";

/**
 * Geometria do mapa da cidade, sem Phaser: posições, toque → destino e rota do avatar.
 *
 * A cidade é desenhada em projeção isométrica. A planta fica numa grade (`gx` desce
 * para a direita da tela, `gy` desce para a esquerda); as posições usadas pelo jogo
 * são as da tela, nas coordenadas do viewport de referência (390×844).
 */
export interface Ponto {
  readonly x: number;
  readonly y: number;
}

/** Ponto na grade da planta. */
export type NaGrade = readonly [gx: number, gy: number];

/** Lado da tela para onde a fachada com a porta está virada. */
export type Frente = "direita" | "esquerda";

export interface Edificio {
  /** Id do estabelecimento em `packages/content/data/estabelecimentos.json`. */
  readonly id: string;
  /** Nome na placa. */
  readonly rotulo: string;
  /** Centro da base, na grade e na tela. */
  readonly grade: NaGrade;
  readonly centro: Ponto;
  readonly frente: Frente;
  /** Onde o avatar para, no caminho em frente à porta. */
  readonly porta: Ponto;
}

export const MUNDO = {
  largura: PALCO_REFERENCIA.largura,
  altura: PALCO_REFERENCIA.altura,
} as const;

/** Meia largura, na tela, de um ladrilho da grade (o ladrilho tem 2:1). */
export const LADRILHO = 10;
/** Onde o centro da praça (0, 0) cai na tela. */
export const CENTRO: Ponto = { x: MUNDO.largura / 2, y: 462 };

export function naTela([gx, gy]: NaGrade): Ponto {
  return { x: CENTRO.x + (gx - gy) * LADRILHO, y: CENTRO.y + ((gx + gy) * LADRILHO) / 2 };
}

/** Base quadrada de cada edifício e altura da silhueta, em ladrilhos. */
export const EDIFICIO = { lado: 6, altura: 6.5 } as const;
/** Meio lado da praça, em ladrilhos. */
export const RAIO_DA_PRACA = 8;
/** Meio lado do anel por onde o avatar contorna a fonte. */
const ANEL = 5;
/** Do centro do edifício até o ponto em que o avatar para, em ladrilhos. */
const DISTANCIA_DA_PORTA = 4.3;

/** O edifício é posicionado pela porta: o centro fica atrás dela, do lado oposto à fachada. */
function edificio(id: string, rotulo: string, porta: NaGrade, frente: Frente): Edificio {
  const [px, py] = porta;
  const grade: NaGrade =
    frente === "direita" ? [px - DISTANCIA_DA_PORTA, py] : [px, py - DISTANCIA_DA_PORTA];
  return { id, rotulo, grade, centro: naTela(grade), frente, porta: naTela(porta) };
}

// Portas, na grade. Cada uma fica na ponta de um caminho que sai do anel da praça.
const PORTA_DO_BANCO: NaGrade = [-8.7, -13.5];
const PORTA_DO_ESCRITORIO: NaGrade = [-9.2, 0];
const PORTA_DO_POSTO: NaGrade = [0.5, -9.2];
const PORTA_DA_IMOBILIARIA: NaGrade = [ANEL, 15];
const PORTA_DO_FORNECEDOR: NaGrade = [15, ANEL];
const PORTA_DA_LOJA: NaGrade = [20, 17];

/**
 * Os 6 estabelecimentos do MVP (ADR-0008), em volta da praça: três atrás dela, virados
 * para a fonte, e três na frente, virados para o jogador.
 */
export const EDIFICIOS: readonly Edificio[] = [
  edificio("banco", "Banco", PORTA_DO_BANCO, "direita"),
  edificio("escritorio-contabil", "Escritório Contábil", PORTA_DO_ESCRITORIO, "direita"),
  edificio("posto-fiscal", "Posto Fiscal", PORTA_DO_POSTO, "esquerda"),
  edificio("imobiliaria", "Imobiliária", PORTA_DA_IMOBILIARIA, "direita"),
  edificio("fornecedor", "Fornecedor", PORTA_DO_FORNECEDOR, "esquerda"),
  edificio("minha-loja", "Hamburgueria", PORTA_DA_LOJA, "direita"),
];

// Os quatro cantos do anel da praça e os pontos em que os caminhos das portas chegam nele.
const ANEL_CIMA: NaGrade = [-ANEL, -ANEL];
const ANEL_DIREITA: NaGrade = [ANEL, -ANEL];
const ANEL_BAIXO: NaGrade = [ANEL, ANEL];
const ANEL_ESQUERDA: NaGrade = [-ANEL, ANEL];
const CHEGADA_DO_ESCRITORIO: NaGrade = [-ANEL, PORTA_DO_ESCRITORIO[1]];
const CHEGADA_DO_POSTO: NaGrade = [PORTA_DO_POSTO[0], -ANEL];
/** Esquina da rua do Banco, na altura do canto de cima do anel. */
const ESQUINA_DO_BANCO: NaGrade = [PORTA_DO_BANCO[0], -ANEL];
/** Esquina da rua que desce do Fornecedor para a Minha Loja. */
const ESQUINA_DA_LOJA: NaGrade = [PORTA_DA_LOJA[0], ANEL];

/** Trechos de caminho por onde o avatar anda, na grade. Todos seguem a grade. */
export const TRECHOS: readonly (readonly [NaGrade, NaGrade])[] = [
  [PORTA_DO_BANCO, ESQUINA_DO_BANCO],
  [ESQUINA_DO_BANCO, ANEL_CIMA],
  [ANEL_CIMA, CHEGADA_DO_POSTO],
  [CHEGADA_DO_POSTO, ANEL_DIREITA],
  [ANEL_DIREITA, ANEL_BAIXO],
  [ANEL_BAIXO, ANEL_ESQUERDA],
  [ANEL_ESQUERDA, CHEGADA_DO_ESCRITORIO],
  [CHEGADA_DO_ESCRITORIO, ANEL_CIMA],
  [CHEGADA_DO_ESCRITORIO, PORTA_DO_ESCRITORIO],
  [CHEGADA_DO_POSTO, PORTA_DO_POSTO],
  [ANEL_BAIXO, PORTA_DA_IMOBILIARIA],
  [ANEL_BAIXO, PORTA_DO_FORNECEDOR],
  [PORTA_DO_FORNECEDOR, ESQUINA_DA_LOJA],
  [ESQUINA_DA_LOJA, PORTA_DA_LOJA],
];

/** Ruas que saem do mapa, para a vizinhança. São só cenário: o avatar não anda nelas. */
export const RUAS_DA_VIZINHANCA: readonly (readonly [NaGrade, NaGrade])[] = [
  [PORTA_DO_BANCO, [PORTA_DO_BANCO[0], -30]],
  [PORTA_DA_LOJA, [PORTA_DA_LOJA[0], 40]],
  [ESQUINA_DA_LOJA, [30, ANEL]],
  [PORTA_DO_ESCRITORIO, [-30, PORTA_DO_ESCRITORIO[1]]],
];

/** Os mesmos trechos, em coordenadas de tela. */
const SEGMENTOS: readonly (readonly [Ponto, Ponto])[] = TRECHOS.map(([a, b]) => [
  naTela(a),
  naTela(b),
]);

/** Onde o avatar começa: na praça, em frente à fonte. */
export const POSICAO_INICIAL: Ponto = naTela(ANEL_BAIXO);

export function edificioPorId(id: string): Edificio | undefined {
  return EDIFICIOS.find((e) => e.id === id);
}

const DA_FRENTE_PARA_TRAS = [...EDIFICIOS].sort((a, b) => b.centro.y - a.centro.y);

/** Edifício sob o ponto tocado, se houver: vale a silhueta do bloco em perspectiva. */
export function edificioNoPonto(ponto: Ponto): Edificio | undefined {
  const meiaLargura = EDIFICIO.lado * LADRILHO;
  const meiaAltura = meiaLargura / 2;
  const alturaDaParede = EDIFICIO.altura * LADRILHO;
  // Onde as silhuetas se cruzam, vale o edifício da frente (o mais baixo na tela).
  return DA_FRENTE_PARA_TRAS.find((e) => {
    const dx = Math.abs(ponto.x - e.centro.x);
    const dy = ponto.y - e.centro.y;
    // A silhueta é o losango da base arrastado para cima pela altura da parede.
    const foraNaVertical = dy > 0 ? dy : Math.max(0, -alturaDaParede - dy);
    return dx / meiaLargura + foraNaVertical / meiaAltura <= 1;
  });
}

const distanciaEntre = (a: Ponto, b: Ponto): number => Math.hypot(a.x - b.x, a.y - b.y);
const TOLERANCIA = 1e-6;
const mesmoPonto = (a: Ponto, b: Ponto): boolean => distanciaEntre(a, b) < TOLERANCIA;

/** Ponto do segmento mais próximo de `p`. */
function maisProximoNoSegmento(p: Ponto, [a, b]: readonly [Ponto, Ponto]): Ponto {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  if (t <= 0) return a;
  if (t >= 1) return b;
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/** Ponto dos caminhos mais próximo de `p`. */
export function pontoNoCaminho(p: Ponto): Ponto {
  let melhor = POSICAO_INICIAL;
  let menor = Number.POSITIVE_INFINITY;
  for (const segmento of SEGMENTOS) {
    const candidato = maisProximoNoSegmento(p, segmento);
    const d = distanciaEntre(p, candidato);
    if (d < menor) {
      menor = d;
      melhor = candidato;
    }
  }
  return melhor;
}

/** Se o ponto está sobre algum caminho. */
export function estaNoCaminho(p: Ponto): boolean {
  return distanciaEntre(p, pontoNoCaminho(p)) < TOLERANCIA;
}

export type Destino =
  | { readonly tipo: "estabelecimento"; readonly edificio: Edificio; readonly ponto: Ponto }
  | { readonly tipo: "rua"; readonly ponto: Ponto };

/** Tocar num edifício leva à porta dele; tocar em outro lugar leva ao caminho mais próximo. */
export function destinoDoToque(toque: Ponto): Destino {
  const tocado = edificioNoPonto(toque);
  if (tocado) return { tipo: "estabelecimento", edificio: tocado, ponto: tocado.porta };
  return { tipo: "rua", ponto: pontoNoCaminho(toque) };
}

/**
 * Menor caminho pelos trechos, de `origem` a `destino` (ambos sobre os caminhos).
 * Nunca atravessa um edifício. Devolve os pontos a visitar, em ordem.
 */
export function rotaAte(origem: Ponto, destino: Ponto): Ponto[] {
  if (mesmoPonto(origem, destino)) return [];

  // Grafo: as pontas dos trechos, mais a origem e o destino ligados aos trechos em que estão.
  const nos: Ponto[] = [origem, destino];
  const indiceDe = (p: Ponto): number => {
    const achado = nos.findIndex((no) => mesmoPonto(no, p));
    if (achado >= 0) return achado;
    nos.push(p);
    return nos.length - 1;
  };
  const arestas: [number, number][] = [];
  const sobre = (p: Ponto, s: readonly [Ponto, Ponto]) =>
    mesmoPonto(maisProximoNoSegmento(p, s), p);
  for (const segmento of SEGMENTOS) {
    const a = indiceDe(segmento[0]);
    const b = indiceDe(segmento[1]);
    arestas.push([a, b]);
    const origemAqui = sobre(origem, segmento);
    const destinoAqui = sobre(destino, segmento);
    if (origemAqui) arestas.push([0, a], [0, b]);
    if (destinoAqui) arestas.push([1, a], [1, b]);
    if (origemAqui && destinoAqui) arestas.push([0, 1]);
  }

  // Dijkstra: o grafo tem uma dúzia de nós.
  const custo = nos.map(() => Number.POSITIVE_INFINITY);
  const anterior = nos.map(() => -1);
  const pendentes = new Set(nos.map((_, i) => i));
  custo[0] = 0;
  while (pendentes.size > 0) {
    let atual = -1;
    for (const i of pendentes) {
      if (atual < 0 || (custo[i] as number) < (custo[atual] as number)) atual = i;
    }
    pendentes.delete(atual);
    if (atual === 1 || custo[atual] === Number.POSITIVE_INFINITY) break;
    for (const [a, b] of arestas) {
      if (a !== atual && b !== atual) continue;
      const vizinho = a === atual ? b : a;
      const novo =
        (custo[atual] as number) + distanciaEntre(nos[atual] as Ponto, nos[vizinho] as Ponto);
      if (novo < (custo[vizinho] as number)) {
        custo[vizinho] = novo;
        anterior[vizinho] = atual;
      }
    }
  }
  // Fora dos caminhos (não deveria acontecer): vai em linha reta.
  if (anterior[1] === -1) return [destino];

  const rota: Ponto[] = [];
  for (let i = 1; i !== 0; i = anterior[i] as number) rota.unshift(nos[i] as Ponto);
  // Tira pontos repetidos (a origem pode coincidir com uma esquina).
  return rota.filter((p, i) => !mesmoPonto(p, i === 0 ? origem : (rota[i - 1] as Ponto)));
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
