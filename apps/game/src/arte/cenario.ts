import { CONTORNO, svg } from "./svg";

export interface GeometriaDoCenario {
  readonly largura: number;
  readonly altura: number;
  /** Rua central, vertical. */
  readonly rua: { readonly x: number; readonly largura: number };
  /** Portas dos edifícios: cada uma ganha uma calçada até a rua. */
  readonly portas: readonly { readonly x: number; readonly y: number }[];
  /** Retângulos ocupados pelos edifícios, para a vegetação não ficar por baixo deles. */
  readonly edificios: readonly {
    readonly x: number;
    readonly y: number;
    readonly largura: number;
    readonly altura: number;
  }[];
}

const FINO = `stroke="${CONTORNO}" stroke-width="1.4" stroke-linejoin="round"`;

function arvore(x: number, y: number, escala = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${escala})">
    <ellipse cx="0" cy="2" rx="17" ry="4.5" fill="#000" opacity="0.16"/>
    <rect x="-3.5" y="-16" width="7" height="18" rx="2" fill="#8a5a3a" ${FINO}/>
    <circle cx="-11" cy="-24" r="12" fill="#5f9a4e" ${FINO}/>
    <circle cx="11" cy="-25" r="13" fill="#6aa856" ${FINO}/>
    <circle cx="0" cy="-36" r="15" fill="#76b660" ${FINO}/>
    <circle cx="-5" cy="-40" r="5" fill="#9bd07e" opacity="0.7"/>
  </g>`;
}

function arbusto(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})"><circle cx="-6" cy="0" r="7" fill="#5f9a4e" ${FINO}/><circle cx="6" cy="1" r="6.5" fill="#6aa856" ${FINO}/><circle cx="0" cy="-5" r="7.5" fill="#76b660" ${FINO}/></g>`;
}

function poste(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="1" rx="6" ry="2" fill="#000" opacity="0.18"/>
    <rect x="-1.6" y="-30" width="3.2" height="31" fill="#3b3f47" ${FINO}/>
    <circle cx="0" cy="-33" r="9" fill="#ffe9a3" opacity="0.35"/>
    <path d="M-5 -30 h10 l-2 -9 h-6z" fill="#ffd96b" ${FINO}/>
    <path d="M-6 -39 h12" stroke="${CONTORNO}" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}

function banco(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="7" rx="14" ry="3" fill="#000" opacity="0.16"/>
    <rect x="-13" y="-8" width="26" height="6" rx="1.5" fill="#b9823f" ${FINO}/>
    <rect x="-13" y="0" width="26" height="5" rx="1.5" fill="#c9924b" ${FINO}/>
    <path d="M-10 5 v4 M10 5 v4" stroke="${CONTORNO}" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

function flores(x: number, y: number, cor: string): string {
  return [
    [0, 0],
    [7, 3],
    [-6, 4],
    [3, -5],
  ]
    .map(
      ([dx = 0, dy = 0]) =>
        `<circle cx="${x + dx}" cy="${y + dy}" r="2.2" fill="${cor}" stroke="${CONTORNO}" stroke-width="0.7"/><circle cx="${x + dx}" cy="${y + dy}" r="0.8" fill="#fff3b0"/>`,
    )
    .join("");
}

/** Fundo do mapa: grama, rua de pedra, calçadas até as portas, árvores e mobiliário. */
export function desenharCenario(g: GeometriaDoCenario): string {
  const meiaRua = g.rua.largura / 2;
  const caminhos = [
    `<rect x="${g.rua.x - meiaRua}" y="-20" width="${g.rua.largura}" height="${g.altura + 40}" rx="6"/>`,
    ...g.portas.map((porta) => {
      const esquerda = Math.min(porta.x, g.rua.x) - 30;
      const direita = Math.max(porta.x, g.rua.x) + 30;
      return `<rect x="${esquerda}" y="${porta.y - 17}" width="${direita - esquerda}" height="34" rx="14"/>`;
    }),
  ].join("");

  // Manchas de grama clara e escura, para o chão não ficar chapado.
  const manchas = [
    [40, 150, 46, 20, "#9ccb78"],
    [330, 190, 52, 22, "#84b862"],
    [70, 360, 60, 22, "#84b862"],
    [320, 400, 50, 20, "#9ccb78"],
    [50, 580, 56, 22, "#9ccb78"],
    [340, 600, 50, 20, "#84b862"],
    [90, 790, 70, 24, "#84b862"],
    [300, 800, 64, 22, "#9ccb78"],
  ]
    .map(
      ([x, y, rx, ry, cor]) =>
        `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${cor}" opacity="0.6"/>`,
    )
    .join("");

  const [alturaDoEdificio = 130] = g.edificios.map((e) => e.altura);
  const linhas = [...new Set(g.edificios.map((e) => e.y))].sort((a, b) => a - b);
  // Vegetação e mobiliário nas faixas livres entre as linhas de edifícios.
  const enfeites = linhas
    .map((topo, indice) => {
      const y = topo + alturaDoEdificio + 58;
      const par = indice % 2 === 0;
      return [
        arvore(22, y, 0.9),
        arvore(g.largura - 22, y + 4, 0.95),
        arbusto(64, y + 2),
        arbusto(g.largura - 66, y - 2),
        par ? poste(g.rua.x - meiaRua - 9, y + 6) : poste(g.rua.x + meiaRua + 9, y + 6),
        par ? banco(g.rua.x + meiaRua + 34, y + 2) : banco(g.rua.x - meiaRua - 34, y + 2),
        flores(par ? 104 : g.largura - 104, y + 8, par ? "#f08fa8" : "#f2c94c"),
        flores(par ? g.largura - 118 : 118, y - 6, par ? "#f2c94c" : "#c9a2f0"),
      ].join("");
    })
    .join("");

  const topoDoMapa = linhas[0] ?? 170;
  const copas = [
    arvore(30, topoDoMapa - 14, 1.05),
    arvore(g.largura - 28, topoDoMapa - 18, 1.1),
    arvore(132, topoDoMapa - 22, 0.8),
    arvore(g.largura - 130, topoDoMapa - 24, 0.8),
  ].join("");

  return svg(
    g.largura,
    g.altura,
    `<defs>
      <pattern id="pedras" width="22" height="16" patternUnits="userSpaceOnUse">
        <rect x="1" y="1" width="9" height="6" rx="2.5" fill="#d9c394"/>
        <rect x="12" y="1" width="9" height="6" rx="2.5" fill="#e9d6ab"/>
        <rect x="-4" y="9" width="9" height="6" rx="2.5" fill="#e9d6ab"/>
        <rect x="7" y="9" width="9" height="6" rx="2.5" fill="#d9c394"/>
        <rect x="18" y="9" width="9" height="6" rx="2.5" fill="#e9d6ab"/>
      </pattern>
    </defs>
    <rect width="${g.largura}" height="${g.altura}" fill="#8fc26c"/>
    ${manchas}
    <g fill="#c2a877" stroke="#a88f5f" stroke-width="5" stroke-linejoin="round">${caminhos}</g>
    <g fill="#e2cfa0">${caminhos}</g>
    <g fill="url(#pedras)">${caminhos}</g>
    ${copas}
    ${enfeites}`,
  );
}
