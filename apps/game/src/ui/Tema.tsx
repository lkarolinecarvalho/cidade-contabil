import type { Tema } from "@cidade/content";
import { type ReactNode, useState } from "react";
import { calar, falar, podeFalar, tocar } from "../som/sons";
import { PONTOS_POR_AFIRMATIVA } from "../state/jogo";
import { jogoStore } from "../state/store";

/** Botão que lê um texto em voz alta, quando o aparelho tem voz em português. */
export function Ouvir({ texto }: { readonly texto: string }) {
  if (!podeFalar()) return null;
  return (
    <button type="button" className="ouvir" aria-label="Ouvir" onClick={() => falar(texto)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        <path
          d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

interface Props {
  readonly tema: Tema;
  /** Texto acima do título (ex.: "Aula com a Marta"). */
  readonly sobretitulo?: string;
  /** Rótulo do botão final. */
  readonly rotuloDoFim: string;
  /** Chamado ao fim do tema, depois de registrá-lo como estudado. */
  readonly aoConcluir: () => void;
  /** Passo em que o estudo começa. Só para testes. */
  readonly inicio?: number;
}

/**
 * Um tema de teoria, um passo por vez: os pontos, o exemplo da hamburgueria e as
 * perguntas de Certo ou Errado. Usado no Escritório e nas aulas antes das missões.
 */
export function EstudoDoTema({ tema, sobretitulo, rotuloDoFim, aoConcluir, inicio = 0 }: Props) {
  const [passo, setPasso] = useState(inicio);
  const [respostas, setRespostas] = useState<readonly ("C" | "E")[]>([]);
  const noExemplo = passo === tema.pontos.length;
  const indiceDaPergunta = passo - tema.pontos.length - 1;
  const pergunta = tema.perguntas[indiceDaPergunta];
  const resposta = respostas[indiceDaPergunta];
  const total = tema.pontos.length + 1 + tema.perguntas.length;
  const acertos = respostas.filter((r, i) => r === tema.perguntas[i]?.gabarito).length;
  const fim = passo >= total;

  const avancar = () => {
    calar();
    if (passo + 1 >= total) jogoStore.getState().registrarTema(tema.id, acertos);
    setPasso(passo + 1);
  };
  const responder = (opcao: "C" | "E") => {
    setRespostas([...respostas, opcao]);
    tocar(opcao === pergunta?.gabarito ? "acerto" : "erro");
  };

  let corpo: ReactNode;
  // Texto do passo, para o botão de ouvir.
  let paraOuvir = "";
  if (fim) {
    corpo = (
      <div className="resultado certo">
        <strong>Tema concluído!</strong>
        <span>
          Você acertou {acertos} de {tema.perguntas.length}. Cada acerto novo vale{" "}
          {PONTOS_POR_AFIRMATIVA} pontos.
        </span>
      </div>
    );
  } else if (pergunta) {
    paraOuvir = pergunta.enunciado;
    corpo = (
      <>
        <p className="tema-rotulo">Certo ou errado?</p>
        <p className="afirmativa">{pergunta.enunciado}</p>
        {resposta === undefined ? (
          <div className="julgar">
            {(["C", "E"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={opcao === "C" ? "certo" : "errado"}
                onClick={() => responder(opcao)}
              >
                {opcao === "C" ? "✓ Certo" : "✗ Errado"}
              </button>
            ))}
          </div>
        ) : (
          <div className={`resultado ${resposta === pergunta.gabarito ? "certo" : "errado"}`}>
            <strong>
              {resposta === pergunta.gabarito ? "Acertou!" : "Não foi dessa vez."} A afirmativa está{" "}
              {pergunta.gabarito === "C" ? "certa" : "errada"}.
            </strong>
            <span>{pergunta.explicacao}</span>
          </div>
        )}
      </>
    );
  } else if (noExemplo) {
    paraOuvir = tema.exemplo;
    corpo = (
      <>
        <p className="tema-rotulo">Na Chapa da Praça</p>
        <p className="tema-ponto tema-exemplo">{tema.exemplo}</p>
      </>
    );
  } else {
    paraOuvir = tema.pontos[passo] ?? "";
    corpo = (
      <>
        <p className="tema-rotulo">
          Ponto {passo + 1} de {tema.pontos.length}
        </p>
        <p className="tema-ponto">{tema.pontos[passo]}</p>
      </>
    );
  }

  const esperandoResposta = pergunta !== undefined && resposta === undefined;
  return (
    <>
      <article className="cartao tema" key={passo}>
        <header className="tema-cabecalho">
          <h3>
            {sobretitulo && <small>{sobretitulo}</small>}
            {tema.titulo}
          </h3>
          {paraOuvir && <Ouvir texto={paraOuvir} />}
        </header>
        {corpo}
      </article>
      <div className="tema-rodape">
        {passo > 0 && !fim ? (
          <button type="button" className="conversa-voltar" onClick={() => setPasso(passo - 1)}>
            ‹ Voltar
          </button>
        ) : (
          <span />
        )}
        <span
          className="conversa-pontos"
          role="img"
          aria-label={`Passo ${Math.min(passo + 1, total)} de ${total}`}
        >
          {Array.from({ length: total }, (_, i) => (
            <i key={`passo-${i + 1}`} className={i === passo ? "atual" : i < passo ? "lida" : ""} />
          ))}
        </span>
        <span />
      </div>
      {fim ? (
        <button type="button" className="botao-principal" onClick={aoConcluir}>
          {rotuloDoFim}
        </button>
      ) : (
        !esperandoResposta && (
          <button type="button" className="botao-principal" onClick={avancar}>
            {passo + 1 >= total ? "Concluir" : "Continuar ›"}
          </button>
        )
      )}
    </>
  );
}
