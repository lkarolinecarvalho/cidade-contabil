import type { IdRegra } from "@cidade/ledger";
import { textoDaRegra } from "../texto/regras";

/** Regra citada no feedback: o ID e o texto de docs/regras-contabeis.md. */
export function RegraCitada({ regra }: { readonly regra: IdRegra }) {
  return (
    <p className="regra">
      <strong>{regra}</strong> {textoDaRegra(regra)}
    </p>
  );
}
