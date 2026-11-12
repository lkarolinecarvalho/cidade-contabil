import type { ReactNode } from "react";
import { jogoStore, useJogo } from "../state/store";

/** Dica de primeira vez: aparece até o jogador dispensá-la, uma vez por sessão. */
export function Dica({ id, children }: { readonly id: string; readonly children: ReactNode }) {
  const vista = useJogo((jogo) => jogo.dicasVistas.includes(id));
  if (vista) return null;
  return (
    <p className="dica">
      <span>{children}</span>
      <button type="button" onClick={() => jogoStore.getState().marcarDica(id)}>
        Entendi
      </button>
    </p>
  );
}
