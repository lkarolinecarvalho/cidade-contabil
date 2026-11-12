import { type ReactNode, useState } from "react";
import { desenharRetrato } from "../arte/bonecos";
import { desenharEdificio, desenharHamburguer, desenharTerrenoVago } from "../arte/edificios";
import { paraDataUrl } from "../arte/svg";

interface Quadro {
  readonly texto: string;
  readonly ilustracao: () => ReactNode;
}

const imagem = (desenho: string, classe = "") => (
  <img className={classe} src={paraDataUrl(desenho)} alt="" />
);
const retrato = (personagem: string) => (
  <span className="retrato abertura-retrato">{imagem(desenharRetrato(personagem))}</span>
);

/** A história de abertura: uma frase por quadro. */
export const QUADROS: readonly Quadro[] = [
  {
    texto: "Todo mundo no bairro conhece o seu hambúrguer.",
    ilustracao: () => imagem(desenharHamburguer(), "abertura-desenho"),
  },
  {
    texto: "Na praça, um ponto vago espera por um dono.",
    ilustracao: () => imagem(desenharTerrenoVago(), "abertura-desenho abertura-terreno"),
  },
  {
    texto: "O Sr. Osvaldo acredita na ideia e quer entrar como sócio.",
    ilustracao: () => (
      <span className="abertura-dupla">
        {retrato("avatar")}
        {retrato("osvaldo")}
      </span>
    ),
  },
  {
    texto:
      "Mas uma empresa de verdade precisa das contas em ordem. A Marta, contadora, vai ajudar.",
    ilustracao: () => retrato("marta-contadora"),
  },
  {
    texto: "Seu objetivo: abrir a Chapa da Praça e fechar o primeiro mês.",
    ilustracao: () => imagem(desenharEdificio("minha-loja"), "abertura-desenho"),
  },
];

/**
 * Abertura do jogo: a tela de título e a história em quadros, por cima do mapa, que
 * começa fechado no ponto vago da praça. Ao terminar (ou pular), a câmera se afasta.
 */
export function Abertura({
  aoTerminar,
  inicio = null,
}: {
  readonly aoTerminar: () => void;
  /** Quadro em que a abertura começa; `null` é a tela de título. Só para testes. */
  readonly inicio?: number | null;
}) {
  const [indice, setIndice] = useState<number | null>(inicio);

  if (indice === null) {
    return (
      <div className="abertura abertura-titulo">
        <div className="abertura-marca">
          <p>Cidade</p>
          <h1>Contábil</h1>
          <span>Aprenda contabilidade abrindo a sua hamburgueria</span>
        </div>
        <button type="button" className="botao-principal" onClick={() => setIndice(0)}>
          Começar
        </button>
      </div>
    );
  }

  const quadro = QUADROS[indice];
  if (!quadro) return null;
  const ultimo = indice + 1 >= QUADROS.length;
  return (
    <div className="abertura abertura-historia">
      <button type="button" className="abertura-pular" onClick={aoTerminar}>
        Pular ›
      </button>
      {/* A chave refaz a animação de entrada a cada quadro. */}
      <div className="abertura-quadro" key={indice}>
        <div className="abertura-ilustracao">{quadro.ilustracao()}</div>
        <p aria-live="polite">{quadro.texto}</p>
      </div>
      <div className="conversa-andamento">
        {indice > 0 ? (
          <button type="button" className="conversa-voltar" onClick={() => setIndice(indice - 1)}>
            ‹ Voltar
          </button>
        ) : (
          <span />
        )}
        <span
          className="conversa-pontos"
          role="img"
          aria-label={`Quadro ${indice + 1} de ${QUADROS.length}`}
        >
          {QUADROS.map((q, k) => (
            <i key={q.texto} className={k === indice ? "atual" : k < indice ? "lida" : ""} />
          ))}
        </span>
        <span />
      </div>
      <button
        type="button"
        className="botao-principal"
        onClick={() => (ultimo ? aoTerminar() : setIndice(indice + 1))}
      >
        {ultimo ? "Abrir a cidade" : "Continuar ›"}
      </button>
    </div>
  );
}
