import type { Afirmativa } from "@cidade/content";
import type { ValoresCalculados } from "@cidade/ledger";
import { formatarCentavos } from "./dinheiro";

export interface TextoDaAfirmativa {
  readonly enunciado: string;
  readonly explicacao: string;
}

/**
 * Troca os placeholders `{{nome}}` pelos valores da operação que o jogador acabou de
 * fazer. Sem operação por trás (na Revisão), usa os valores de exemplo da afirmativa.
 */
export function preencherAfirmativa(
  afirmativa: Afirmativa,
  valoresDaOperacao?: ValoresCalculados,
): TextoDaAfirmativa {
  const valores: Readonly<Record<string, number | undefined>> = {
    ...afirmativa.exemplo,
    ...valoresDaOperacao,
  };
  const preencher = (texto: string): string =>
    texto.replace(/\{\{\s*([^}]*?)\s*\}\}/g, (_, nome: string) => {
      const valor = valores[nome];
      if (valor === undefined) throw new Error(`Sem valor para {{${nome}}} em ${afirmativa.id}.`);
      return formatarCentavos(valor);
    });
  return {
    enunciado: preencher(afirmativa.enunciado),
    explicacao: preencher(afirmativa.explicacao),
  };
}
