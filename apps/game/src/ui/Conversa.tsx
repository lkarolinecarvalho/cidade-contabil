import { type ReactNode, useState } from "react";
import { Retrato } from "./icones";

export interface Fala {
  readonly fala: "npc" | "jogador";
  readonly texto: string;
}

interface Props {
  readonly falas: readonly Fala[];
  /** Id, nome e papel de quem conversa com o jogador. */
  readonly npc: { readonly id: string; readonly nome: string; readonly papel: string };
  /** Botão da última fala: a decisão do jogador (aceitar a proposta, responder). */
  readonly acaoFinal: ReactNode;
  readonly aoConcluir: () => void;
  /** Mostrado na última fala, antes da decisão (ex.: o cartão com os dados da operação). */
  readonly anexo?: ReactNode;
  /** Fala em que a conversa começa. Só para testes. */
  readonly inicio?: number;
}

/**
 * Conversa com o NPC, uma fala por vez: o jogador toca em "Continuar" (ou no balão)
 * para ouvir a próxima, e só na última decide. Evita o paredão de texto.
 */
export function Conversa({ falas, npc, acaoFinal, aoConcluir, anexo, inicio = 0 }: Props) {
  const [indice, setIndice] = useState(inicio);
  const fala = falas[indice];
  if (!fala) return null;
  const ultima = indice + 1 >= falas.length;
  const doJogador = fala.fala === "jogador";
  const avancar = () => {
    if (!ultima) setIndice(indice + 1);
  };

  return (
    <div className="conversa-passo">
      <div className={`conversa${doJogador ? " conversa-do-jogador" : ""}`}>
        {/* A chave refaz a animação de entrada a cada fala. */}
        <div className="conversa-quem" key={`quem-${indice}`}>
          <Retrato
            personagem={doJogador ? "avatar" : npc.id}
            nome={doJogador ? "Você" : npc.nome}
          />
          <span>
            <strong>{doJogador ? "Você" : npc.nome}</strong>
            {!doJogador && ` · ${npc.papel}`}
          </span>
        </div>
        <button
          type="button"
          className="balao"
          key={indice}
          onClick={avancar}
          disabled={ultima}
          aria-live="polite"
        >
          {fala.texto}
        </button>
      </div>

      {falas.length > 1 && (
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
            aria-label={`Fala ${indice + 1} de ${falas.length}`}
          >
            {falas.map((f, k) => (
              <i key={f.texto} className={k === indice ? "atual" : k < indice ? "lida" : ""} />
            ))}
          </span>
          <span />
        </div>
      )}

      {ultima && anexo}

      {ultima ? (
        <button type="button" className="botao-principal conversa-decisao" onClick={aoConcluir}>
          {acaoFinal}
        </button>
      ) : (
        <button type="button" className="botao-principal botao-continuar" onClick={avancar}>
          Continuar ›
        </button>
      )}
    </div>
  );
}
