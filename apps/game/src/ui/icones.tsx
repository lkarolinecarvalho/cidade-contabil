import type { ReactNode } from "react";
import { desenharRetrato } from "../arte/personagens";
import { paraDataUrl } from "../arte/svg";

const TRACO = "#4a3728";

function Icone({ children, rotulo }: { readonly children: ReactNode; readonly rotulo?: string }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      role={rotulo ? "img" : undefined}
      aria-label={rotulo}
      aria-hidden={rotulo ? undefined : true}
    >
      {children}
    </svg>
  );
}

const traco = { stroke: TRACO, strokeWidth: 1.6, strokeLinejoin: "round" } as const;

export const IconeEstrela = () => (
  <Icone>
    <path
      d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z"
      fill="#f7c63c"
      {...traco}
    />
  </Icone>
);

export const IconeCarteira = () => (
  <Icone>
    <rect x="2.5" y="6" width="19" height="13.5" rx="3" fill="#c98a4b" {...traco} />
    <path d="M4 6.5l11-3.2a1.6 1.6 0 0 1 2 1.5V6" fill="#e2a868" {...traco} />
    <rect x="14.5" y="10.5" width="7" height="5" rx="2" fill="#f7e2b8" {...traco} />
    <circle cx="17.2" cy="13" r="1" fill={TRACO} />
  </Icone>
);

export const IconeMoeda = () => (
  <Icone>
    <circle cx="12" cy="12" r="9.2" fill="#f7c63c" {...traco} />
    <circle cx="12" cy="12" r="6.2" fill="#fbdc6e" stroke="#c9942a" strokeWidth="1" />
    <text
      x="12"
      y="16"
      textAnchor="middle"
      fontSize="10.5"
      fontWeight="800"
      fill="#8a5a00"
      fontFamily="Arial, sans-serif"
    >
      $
    </text>
  </Icone>
);

export const IconeCalendario = () => (
  <Icone>
    <rect x="3" y="5" width="18" height="15.5" rx="3" fill="#fffaf0" {...traco} />
    <path d="M3 9.5h18V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3z" fill="#d6453c" {...traco} />
    <path d="M8 3v4M16 3v4" stroke={TRACO} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8.5" cy="14.5" r="1.3" fill={TRACO} />
    <circle cx="12.5" cy="14.5" r="1.3" fill={TRACO} />
  </Icone>
);

export const IconeMapa = () => (
  <Icone>
    <path d="M3 6l6-2.5 6 2.5 6-2.5v14.5L15 20.5 9 18l-6 2.5z" fill="#9ccb78" {...traco} />
    <path d="M9 3.5V18M15 6v14.5" stroke={TRACO} strokeWidth="1.4" />
    <circle cx="12" cy="10" r="1.6" fill="#d6453c" />
  </Icone>
);

export const IconeBalanca = () => (
  <Icone>
    <path
      d="M12 4v15M7 19.5h10M5 7.5h14"
      stroke={TRACO}
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    <path d="M2.5 13.5a3 3 0 0 0 6 0L5.5 8z" fill="#f7c63c" {...traco} />
    <path d="M15.5 13.5a3 3 0 0 0 6 0L18.5 8z" fill="#f7c63c" {...traco} />
  </Icone>
);

export const IconeBarras = () => (
  <Icone>
    <rect x="3.5" y="12" width="4.5" height="8.5" rx="1" fill="#6fae5a" {...traco} />
    <rect x="9.8" y="8" width="4.5" height="12.5" rx="1" fill="#5a9a49" {...traco} />
    <rect x="16" y="3.5" width="4.5" height="17" rx="1" fill="#447f37" {...traco} />
  </Icone>
);

export const IconeAperto = () => (
  <Icone>
    <path d="M2 9l4-2 5 1.5 2.5-1.5L18 8l4 1.5v6l-3 1-6 3.5-7-4.5H2z" fill="#fffaf0" {...traco} />
    <path
      d="M8.5 12.5l3 2.2 3-2.2M11 8.5l-3 3"
      stroke={TRACO}
      strokeWidth="1.4"
      fill="none"
      strokeLinecap="round"
    />
  </Icone>
);

export const IconeEngrenagem = () => (
  <Icone>
    <path
      d="M10.3 2.5h3.4l.5 2.4 1.7.7 2-1.3 2.4 2.4-1.3 2 .7 1.7 2.4.5v3.4l-2.4.5-.7 1.7 1.3 2-2.4 2.4-2-1.3-1.7.7-.5 2.4h-3.4l-.5-2.4-1.7-.7-2 1.3-2.4-2.4 1.3-2-.7-1.7-2.4-.5v-3.4l2.4-.5.7-1.7-1.3-2 2.4-2.4 2 1.3 1.7-.7z"
      fill="#b9c2cc"
      {...traco}
    />
    <circle cx="12" cy="12" r="3.4" fill="#fffaf0" {...traco} />
  </Icone>
);

export const IconeCerto = () => (
  <Icone>
    <path
      d="M4.5 12.5l5 5L19.5 7"
      stroke="currentColor"
      strokeWidth="3.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icone>
);

/** Retrato redondo de um personagem (id do NPC no conteúdo, ou "avatar"). */
export function Retrato({
  personagem,
  nome,
}: {
  readonly personagem: string;
  readonly nome: string;
}) {
  return (
    <span className="retrato">
      <img src={paraDataUrl(desenharRetrato(personagem))} alt={nome} />
    </span>
  );
}
