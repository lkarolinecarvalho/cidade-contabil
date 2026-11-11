import { CONTORNO, svg } from "./svg";

/** Tamanho do desenho de cada edifício; a porta fica na base, no centro. */
export const DESENHO_DO_EDIFICIO = { largura: 150, altura: 130 } as const;

const T = `stroke="${CONTORNO}" stroke-width="2" stroke-linejoin="round"`;
const FINO = `stroke="${CONTORNO}" stroke-width="1.4" stroke-linejoin="round"`;
const VIDRO = "#bfe3f0";

const sombra = `<ellipse cx="75" cy="123" rx="64" ry="6" fill="#000" opacity="0.18"/>`;

function janela(x: number, y: number, largura: number, altura: number): string {
  const meioX = x + largura / 2;
  const meioY = y + altura / 2;
  return `<rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="2" fill="${VIDRO}" ${FINO}/><path d="M${meioX} ${y} v${altura} M${x} ${meioY} h${largura}" ${FINO} fill="none"/><path d="M${x + 3} ${y + altura - 4} l6 -6" stroke="#fff" stroke-width="1.6" opacity="0.8"/>`;
}

function caixote(x: number, y: number, lado: number): string {
  return `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="1.5" fill="#dba95a" ${FINO}/><path d="M${x} ${y} l${lado} ${lado} M${x + lado} ${y} l-${lado} ${lado}" stroke="#a9772f" stroke-width="1.2"/>`;
}

function porta(x: number, y: number, largura: number, altura: number, cor: string): string {
  return `<rect x="${x}" y="${y}" width="${largura}" height="${altura}" rx="2" fill="${cor}" ${T}/><circle cx="${x + largura - 4.5}" cy="${y + altura / 2 + 2}" r="1.6" fill="#f2c94c" stroke="${CONTORNO}" stroke-width="0.8"/>`;
}

function minhaLoja(): string {
  const listras = Array.from({ length: 9 }, (_, i) => {
    const x = 12 + i * 14;
    return `<path d="M${x} 54 h14 v15 a7 7 0 0 1 -14 0z" fill="${i % 2 === 0 ? "#d94f45" : "#fff7ec"}" ${FINO}/>`;
  }).join("");
  return `${sombra}
    <path d="M14 52 L32 14 H118 L136 52z" fill="#c8643c" ${T}/>
    <path d="M26 27 H124 M20 40 H130" stroke="#a54e2b" stroke-width="1.6" fill="none"/>
    <rect x="18" y="50" width="114" height="72" fill="#f6e3b8" ${T}/>
    <rect x="24" y="82" width="36" height="30" rx="2" fill="${VIDRO}" ${FINO}/>
    <rect x="28" y="100" width="8" height="12" fill="#e2893f" ${FINO}/><rect x="38" y="96" width="8" height="16" fill="#6fa55b" ${FINO}/><rect x="48" y="102" width="8" height="10" fill="#d94f45" ${FINO}/>
    <rect x="90" y="82" width="36" height="30" rx="2" fill="${VIDRO}" ${FINO}/>
    <rect x="94" y="102" width="8" height="10" fill="#f2c94c" ${FINO}/><rect x="104" y="97" width="8" height="15" fill="#5b8fc9" ${FINO}/><rect x="114" y="100" width="8" height="12" fill="#e2893f" ${FINO}/>
    ${porta(65, 82, 20, 40, "#8a5a3a")}
    <rect x="68" y="86" width="14" height="14" rx="1.5" fill="${VIDRO}" ${FINO}/>
    ${listras}
    <rect x="12" y="50" width="126" height="6" rx="2" fill="#b8423a" ${FINO}/>`;
}

function fornecedor(): string {
  const tabuas = Array.from(
    { length: 7 },
    (_, i) => `<path d="M${32 + i * 14} 58 V122" stroke="#a9834f" stroke-width="1.2"/>`,
  ).join("");
  return `${sombra}
    <path d="M10 58 L75 14 L140 58z" fill="#7d8ea3" ${T}/>
    <path d="M30 46 H120 M48 34 H102" stroke="#63748a" stroke-width="1.6"/>
    <rect x="18" y="56" width="114" height="66" fill="#cfa66d" ${T}/>
    ${tabuas}
    <rect x="42" y="72" width="66" height="50" rx="3" fill="#3b2f26" ${T}/>
    ${caixote(47, 100, 22)}${caixote(71, 102, 20)}${caixote(58, 81, 20)}${caixote(92, 106, 14)}
    ${caixote(113, 104, 18)}
    <circle cx="75" cy="40" r="7" fill="#f3ead6" ${FINO}/>`;
}

function banco(): string {
  const colunas = [30, 52, 88, 110]
    .map(
      (x) =>
        `<rect x="${x}" y="56" width="10" height="52" fill="#fffaf0" ${FINO}/><rect x="${x - 2}" y="54" width="14" height="5" rx="1" fill="#f3ead6" ${FINO}/>`,
    )
    .join("");
  return `${sombra}
    <rect x="12" y="114" width="126" height="9" rx="1.5" fill="#d8d0bd" ${T}/>
    <rect x="19" y="107" width="112" height="8" rx="1.5" fill="#e3dccb" ${T}/>
    <rect x="24" y="52" width="102" height="56" fill="#f1e7d0" ${T}/>
    ${porta(66, 72, 18, 36, "#7a5a3a")}
    ${colunas}
    <rect x="18" y="44" width="114" height="10" rx="1.5" fill="#e6dcc4" ${T}/>
    <path d="M14 44 L75 10 L136 44z" fill="#f3ead6" ${T}/>
    <circle cx="75" cy="31" r="9.5" fill="#f2b632" ${FINO}/>
    <text x="75" y="35.5" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#6b4a00">$</text>`;
}

function escritorioContabil(): string {
  return `${sombra}
    <path d="M12 54 L34 16 H116 L138 54z" fill="#5f7790" ${T}/>
    <path d="M27 29 H123 M20 42 H130" stroke="#4b6078" stroke-width="1.6"/>
    <rect x="20" y="52" width="110" height="70" fill="#efe1c2" ${T}/>
    ${janela(28, 70, 26, 26)}${janela(96, 70, 26, 26)}
    ${porta(64, 82, 22, 40, "#2f5a4a")}
    <circle cx="75" cy="67" r="11" fill="#fffaf0" ${FINO}/>
    <g fill="none" stroke="${CONTORNO}" stroke-width="1.4" stroke-linecap="round">
      <path d="M75 60.5 V73 M70.5 73 H79.5 M68 63 H82"/>
      <path d="M65.5 67 q2.5 3.4 5 0z M79.5 67 q2.5 3.4 5 0z" fill="#f2b632"/>
      <path d="M68 63 l-2.5 4 M68 63 l2.5 4 M82 63 l-2.5 4 M82 63 l2.5 4"/>
    </g>`;
}

function postoFiscal(): string {
  const janelas = [0, 1]
    .flatMap((linha) =>
      [0, 1, 2, 3].map(
        (coluna) =>
          `<rect x="${25 + coluna * 27}" y="${49 + linha * 19}" width="18" height="13" rx="1.5" fill="${VIDRO}" ${FINO}/>`,
      ),
    )
    .join("");
  return `${sombra}
    <path d="M120 8 V34" stroke="${CONTORNO}" stroke-width="2" stroke-linecap="round"/>
    <rect x="121" y="9" width="18" height="12" fill="#2e8b57" ${FINO}/>
    <path d="M130 10.5 l7 4.5 -7 4.5 -7 -4.5z" fill="#f2c94c" stroke="${CONTORNO}" stroke-width="0.8"/>
    <rect x="16" y="40" width="118" height="82" fill="#e2e8ef" ${T}/>
    <rect x="10" y="32" width="130" height="10" rx="2" fill="#8492a6" ${T}/>
    ${janelas}
    <rect x="48" y="88" width="54" height="11" rx="2" fill="#2f4a6b" ${FINO}/>
    <text x="75" y="96.5" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="#fff" letter-spacing="1">SEFAZ</text>
    <rect x="62" y="101" width="26" height="21" rx="1.5" fill="#4f5d73" ${T}/>
    <path d="M75 101 V122" stroke="${CONTORNO}" stroke-width="1.4"/>`;
}

function imobiliaria(): string {
  return `${sombra}
    <rect x="98" y="16" width="13" height="24" fill="#a8563a" ${T}/>
    <path d="M10 58 L75 14 L140 58z" fill="#d98c4a" ${T}/>
    <path d="M32 46 H118 M50 34 H100" stroke="#b9722f" stroke-width="1.6"/>
    <rect x="22" y="56" width="106" height="66" fill="#f4dcc6" ${T}/>
    <circle cx="75" cy="40" r="7" fill="${VIDRO}" ${FINO}/>
    ${janela(30, 72, 26, 26)}
    ${porta(65, 80, 20, 42, "#3f7a55")}
    <rect x="94" y="72" width="30" height="22" rx="2" fill="#fffaf0" ${FINO}/>
    <text x="109" y="82" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" text-anchor="middle" fill="#c8553f">VENDE</text>
    <text x="109" y="90" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" text-anchor="middle" fill="#c8553f">ALUGA</text>
    <path d="M109 94 V104" stroke="${CONTORNO}" stroke-width="1.6"/>`;
}

const DESENHOS: Readonly<Record<string, () => string>> = {
  "minha-loja": minhaLoja,
  fornecedor,
  banco,
  "escritorio-contabil": escritorioContabil,
  "posto-fiscal": postoFiscal,
  imobiliaria,
};

/** Fachada do estabelecimento, pelo id do conteúdo. */
export function desenharEdificio(id: string): string {
  const desenho = DESENHOS[id];
  if (!desenho) throw new Error(`Sem desenho para o estabelecimento "${id}".`);
  return svg(DESENHO_DO_EDIFICIO.largura, DESENHO_DO_EDIFICIO.altura, desenho());
}

export function temDesenhoDeEdificio(id: string): boolean {
  return id in DESENHOS;
}
