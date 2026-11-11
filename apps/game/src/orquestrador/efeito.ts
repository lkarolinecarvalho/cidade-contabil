import type { Centavos, CodigoConta, GrupoConta, Lancamento, PlanoDeContas } from "@cidade/ledger";

export type Direcao = "aumenta" | "diminui";

/** Efeito de uma operação no saldo de uma conta, para o painel "Efeito no Patrimônio". */
export interface EfeitoNaConta {
  readonly conta: CodigoConta;
  readonly nome: string;
  readonly grupo: GrupoConta;
  readonly direcao: Direcao;
  readonly valorCentavos: Centavos;
}

const ROTULO_DO_GRUPO: Readonly<Record<GrupoConta, string>> = {
  ativo_circulante: "Ativo",
  imobilizado: "Ativo",
  passivo_circulante: "Passivo",
  patrimonio_liquido: "Patrimônio Líquido",
  receita: "Receita",
  deducao_receita: "Dedução da receita",
  custo: "Custo",
  despesa_operacional: "Despesa",
};

export function rotuloDoGrupo(grupo: GrupoConta): string {
  return ROTULO_DO_GRUPO[grupo];
}

/**
 * Quais contas sobem e quais descem com os lançamentos, na ordem em que aparecem.
 * "Aumenta" é no lado da natureza da conta: débito em conta devedora, crédito em credora.
 */
export function efeitoDosLancamentos(
  plano: PlanoDeContas,
  lancamentos: readonly Lancamento[],
): EfeitoNaConta[] {
  const variacao = new Map<CodigoConta, number>();
  for (const lancamento of lancamentos) {
    for (const partida of lancamento.partidas) {
      const natureza = plano.contas.find((c) => c.codigo === partida.conta)?.natureza;
      const aFavor = (partida.lado === "D") === (natureza === "devedora");
      variacao.set(
        partida.conta,
        (variacao.get(partida.conta) ?? 0) + (aFavor ? 1 : -1) * partida.valorCentavos,
      );
    }
  }
  return [...variacao.entries()]
    .filter(([, valor]) => valor !== 0)
    .map(([codigo, valor]) => {
      const conta = plano.contas.find((c) => c.codigo === codigo);
      if (!conta) throw new Error(`Conta fora do plano: ${codigo}`);
      return {
        conta: codigo,
        nome: conta.nome,
        grupo: conta.grupo,
        direcao: valor > 0 ? ("aumenta" as const) : ("diminui" as const),
        valorCentavos: Math.abs(valor),
      };
    });
}
