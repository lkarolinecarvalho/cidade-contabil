import type { Afirmativa } from "@cidade/content";
import type { ValoresCalculados } from "@cidade/ledger";
import { useState } from "react";
import { PONTOS_POR_AFIRMATIVA, type Resposta, resultadoDaResposta } from "../state/jogo";
import { jogoStore, useJogo } from "../state/store";
import { preencherAfirmativa } from "../texto/afirmativas";
import { RegraCitada } from "./RegraCitada";

interface Props {
  readonly afirmativas: readonly Afirmativa[];
  /** Valores da operação que o jogador acabou de fazer; sem eles, vale o exemplo da afirmativa. */
  readonly valores?: ValoresCalculados | undefined;
  readonly aoContinuar: () => void;
}

/**
 * "Julgue a Afirmação": Certo ou Errado, com a explicação e a regra. No modo banca
 * aparece também "Deixar em branco", e o placar soma +1, −1 ou 0.
 */
export function JulgarAfirmativas({ afirmativas, valores, aoContinuar }: Props) {
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
