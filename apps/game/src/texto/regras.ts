import type { IdRegra } from "@cidade/ledger";
import documento from "../../../../docs/regras-contabeis.md?raw";

/**
 * Texto de cada regra, lido de docs/regras-contabeis.md: o jogo mostra ao jogador
 * exatamente o que está na fonte da verdade, sem uma segunda cópia para manter.
 */
const TEXTOS: ReadonlyMap<string, string> = new Map(
  [...documento.matchAll(/^- \*\*(R-[A-Z]+-\d+)\*\* — ([\s\S]*?)(?=\n- \*\*R-|\n\s*\n|\n#)/gm)].map(
    ([, id = "", texto = ""]) => [
      id,
      texto
        .replace(/\s+/g, " ")
        .replace(/\*\*|`/g, "")
        .replace(/ ?⚠️ VALIDAR/g, "")
        .replace(/📘 SIMPLIFICAÇÃO: ?/g, "")
        .trim(),
    ],
  ),
);

export function textoDaRegra(id: IdRegra): string {
  return TEXTOS.get(id) ?? "";
}

export function regrasComTexto(): string[] {
  return [...TEXTOS.keys()];
}
