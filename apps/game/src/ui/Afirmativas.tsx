import type { Afirmativa } from "@cidade/content";
import type { ValoresCalculados } from "@cidade/ledger";
import { useState } from "react";
import { tocar } from "../som/sons";
import { PONTOS_POR_AFIRMATIVA, type Resposta, resultadoDaResposta } from "../state/jogo";
import { jogoStore, useJogo } from "../state/store";
import { preencherAfirmativa } from "../texto/afirmativas";
import { Dica } from "./Dica";
import { RegraCitada } from "./RegraCitada";

interface Props {
  readonly afirmativas: readonly Afirmativa[];
  /** Valores da operação que o jogador acabou de fazer; sem eles, vale o exemplo da afirmativa. */
  readonly valores?: ValoresCalculados | undefined;
  readonly aoContinuar: () => void;
  /** Avisado a cada resposta, para quem quiser guardar e mostrar de novo depois. */
  readonly aoResponder?: (afirmativa: Afirmativa, resposta: Resposta) => void;
}

/**
 * "Julgue a Afirmação": Certo ou Errado, com a explicação e a regra. No modo banca
 * aparece também "Deixar em branco", e o placar soma +1, −1 ou 0.
 */
export function JulgarAfirmativas({ afirmativas, valores, aoContinuar, aoResponder }: Props) {
  const modoBanca = useJogo((jogo) => jogo.modoBanca);
  const [indice, setIndice] = useState(0);
  // `undefined`: ainda não respondeu. `null`: deixou em branco.
  const [resposta, setResposta] = useState<Resposta | undefined>(undefined);
  const afirmativa = afirmativas[indice];
  if (!afirmativa) return null;
  const texto = preencherAfirmativa(afirmativa, valores);

  const responder = (escolha: Resposta) => {
    setResposta(escolha);
    jogoStore.getState().registrarResposta(afirmativa, escolha);
    const acertou = resultadoDaResposta(afirmativa, escolha) === "acerto";
    if (escolha !== null) tocar(acertou ? "acerto" : "erro");
    aoResponder?.(afirmativa, escolha);
  };
  const avancar = () => {
    if (indice + 1 >= afirmativas.length) return aoContinuar();
    setIndice(indice + 1);
    setResposta(undefined);
  };

  const resultado = resposta === undefined ? null : resultadoDaResposta(afirmativa, resposta);
  const veredito = {
    acerto: modoBanca ? "Acertou! +1 no placar." : `Acertou! +${PONTOS_POR_AFIRMATIVA} pts.`,
    erro: modoBanca ? "Errou: −1 no placar." : "Não foi dessa vez.",
    branco: "Em branco: 0 no placar.",
  };

  return (
    <section className="etapa">
      <h4>
        Julgue a Afirmação{" "}
        <small>
          {indice + 1} de {afirmativas.length}
        </small>
      </h4>
      {indice === 0 && resultado === null && (
        <Dica id="afirmativas">
          Julgue como numa prova de Certo ou Errado. O conceito que você errar volta depois, na
          Revisão do Escritório.
        </Dica>
      )}
      <p className="afirmativa">{texto.enunciado}</p>
      {resultado === null ? (
        <>
          <div className="julgar">
            <button type="button" className="certo" onClick={() => responder("C")}>
              ✓ Certo
            </button>
            <button type="button" className="errado" onClick={() => responder("E")}>
              ✗ Errado
            </button>
          </div>
          {modoBanca && (
            <button type="button" className="botao-secundario" onClick={() => responder(null)}>
              Deixar em branco
            </button>
          )}
        </>
      ) : (
        <>
          <div
            className={`resultado ${resultado === "acerto" ? "certo" : resultado === "erro" ? "errado" : "neutro"}`}
          >
            <strong>
              {veredito[resultado]} A afirmativa está{" "}
              {afirmativa.gabarito === "C" ? "certa" : "errada"}.
            </strong>
            <span>{texto.explicacao}</span>
          </div>
          {afirmativa.regras.map((regra) => (
            <RegraCitada key={regra} regra={regra} />
          ))}
          <button type="button" className="botao-principal" onClick={avancar}>
            {indice + 1 >= afirmativas.length ? "Continuar" : "Próxima"}
          </button>
        </>
      )}
    </section>
  );
}

const NOME_DA_RESPOSTA = { C: "Certo", E: "Errado" } as const;

/**
 * Afirmativas já julgadas, só para rever: o enunciado, a resposta dada, o gabarito e a
 * explicação. Não pontua de novo nem mexe na repetição espaçada.
 */
export function AfirmativasJulgadas({
  afirmativas,
  respostas,
  valores,
  aoContinuar,
}: {
  readonly afirmativas: readonly Afirmativa[];
  /** Resposta dada a cada afirmativa, pelo id. `null` é em branco. */
  readonly respostas: Readonly<Record<string, Resposta>>;
  readonly valores?: ValoresCalculados | undefined;
  readonly aoContinuar: () => void;
}) {
  return (
    <section className="etapa">
      <h4>
        Afirmativas <small>já respondidas</small>
      </h4>
      <ul className="julgadas">
        {afirmativas.map((afirmativa) => {
          const texto = preencherAfirmativa(afirmativa, valores);
          const dada = respostas[afirmativa.id];
          const resultado = dada === undefined ? null : resultadoDaResposta(afirmativa, dada);
          return (
            <li key={afirmativa.id} className={resultado ?? ""}>
              <p className="afirmativa">{texto.enunciado}</p>
              <p className="julgada-resposta">
                {dada === undefined
                  ? ""
                  : dada === null
                    ? "Você deixou em branco. "
                    : `Você marcou ${NOME_DA_RESPOSTA[dada]}. `}
                <strong>Gabarito: {NOME_DA_RESPOSTA[afirmativa.gabarito]}.</strong>
              </p>
              <p className="julgada-explicacao">{texto.explicacao}</p>
            </li>
          );
        })}
      </ul>
      <button type="button" className="botao-principal" onClick={aoContinuar}>
        Continuar
      </button>
    </section>
  );
}
