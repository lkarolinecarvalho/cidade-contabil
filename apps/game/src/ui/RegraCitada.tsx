import { type IdRegra, NOTAS_DIDATICAS } from "@cidade/ledger";
import { textoDaRegra } from "../texto/regras";

/**
 * Regra citada no feedback: o ID e o texto de docs/regras-contabeis.md. As
 * simplificações didáticas (📘) aparecem como "nota didática", para o jogador não levar
 * a simplificação para a prova.
 */
export function RegraCitada({ regra }: { readonly regra: IdRegra }) {
  const nota = (NOTAS_DIDATICAS as Readonly<Partial<Record<IdRegra, string>>>)[regra];
  if (nota) {
    return (
      <p className="regra nota-didatica">
        <strong>Nota didática</strong> {nota}
      </p>
    );
  }
  return (
    <p className="regra">
      <strong>{regra}</strong> {textoDaRegra(regra)}
    </p>
  );
}
