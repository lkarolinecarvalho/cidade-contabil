import type { Conta, PlanoDeContas } from "@cidade/ledger";
import { classificacaoDoGrupo } from "./efeito";

/**
 * Desafios do Escritório: exercícios rápidos, sem lançamento. A ordem das perguntas vem
 * de uma semente, para o sorteio ser repetível (e testável).
 */

/** Gerador simples e determinístico de números entre 0 e 1. */
function sorteador(semente: number): () => number {
  let estado = (Math.trunc(semente) >>> 0) + 1;
  return () => {
    // Gerador congruente linear (constantes de Numerical Recipes).
    estado = (Math.imul(estado, 1_664_525) + 1_013_904_223) >>> 0;
    return estado / 4_294_967_296;
  };
}

/** Embaralha sem alterar a lista original. A mesma semente dá sempre a mesma ordem. */
export function embaralhar<T>(lista: readonly T[], semente: number): T[] {
  const sortear = sorteador(semente);
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(sortear() * (i + 1));
    const a = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = a;
  }
  return copia;
}

export const RODADAS_POR_DESAFIO = 6;

export interface RodadaDeEscolha {
  /** Nome da conta perguntada. */
  readonly conta: string;
  readonly opcoes: readonly string[];
  readonly correta: string;
}

/** "Onde fica a conta?": escolher o grupo da conta entre quatro opções. */
export function rodadasDeClassificacao(plano: PlanoDeContas, semente: number): RodadaDeEscolha[] {
  const grupos = [...new Set(plano.contas.map((c) => classificacaoDoGrupo(c.grupo)))];
  return embaralhar(plano.contas, semente)
    .slice(0, RODADAS_POR_DESAFIO)
    .map((conta, indice) => {
      const correta = classificacaoDoGrupo(conta.grupo);
      const erradas = embaralhar(
        grupos.filter((g) => g !== correta),
        semente + indice + 1,
      ).slice(0, 3);
      return {
        conta: conta.nome,
        correta,
        opcoes: embaralhar([correta, ...erradas], semente + 100 + indice),
      };
    });
}

const NATUREZA: Readonly<Record<Conta["natureza"], string>> = {
  devedora: "Devedora (aumenta a débito)",
  credora: "Credora (aumenta a crédito)",
};

/** "Devedora ou credora?": dizer para que lado a conta aumenta. */
export function rodadasDeNatureza(plano: PlanoDeContas, semente: number): RodadaDeEscolha[] {
  return embaralhar(plano.contas, semente)
    .slice(0, RODADAS_POR_DESAFIO)
    .map((conta) => ({
      conta: conta.nome,
      correta: NATUREZA[conta.natureza],
      opcoes: [NATUREZA.devedora, NATUREZA.credora],
    }));
}

/** Estrutura da DRE, de cima para baixo (R-DEM-02). */
export const ORDEM_DA_DRE: readonly string[] = [
  "Receita Bruta de Vendas",
  "(−) Deduções da receita",
  "= Receita Líquida",
  "(−) Custo das vendas",
  "= Lucro Bruto",
  "(−) Despesas operacionais",
  "(±) Resultado financeiro",
  "= Resultado do período",
];

/** "Monte a DRE": as linhas fora de ordem, para o jogador tocar na sequência certa. */
export function linhasDaDreEmbaralhadas(semente: number): string[] {
  const embaralhadas = embaralhar(ORDEM_DA_DRE, semente);
  // Nunca entrega já na ordem certa.
  return embaralhadas.every((linha, i) => linha === ORDEM_DA_DRE[i])
    ? [...ORDEM_DA_DRE].reverse()
    : embaralhadas;
}
