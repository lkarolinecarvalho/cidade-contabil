import type {
  Centavos,
  CodigoConta,
  Conta,
  GrupoConta,
  Lancamento,
  PlanoDeContas,
} from "@cidade/ledger";

export type Direcao = "aumenta" | "diminui";

/** Efeito de uma operação no saldo de uma conta, para o painel "Efeito no Patrimônio". */
export interface EfeitoNaConta {
  readonly conta: CodigoConta;
  readonly nome: string;
  readonly grupo: GrupoConta;
  /** Grupo e subgrupo da conta, como no Balanço e na DRE (ex.: "Ativo Não Circulante — Imobilizado"). */
  readonly classificacao: string;
  readonly direcao: Direcao;
  readonly valorCentavos: Centavos;
}

/** Grupo e subgrupo de cada conta, na estrutura do Balanço Patrimonial e da DRE. */
const CLASSIFICACAO_DO_GRUPO: Readonly<Record<GrupoConta, string>> = {
  ativo_circulante: "Ativo Circulante",
  imobilizado: "Ativo Não Circulante — Imobilizado",
  passivo_circulante: "Passivo Circulante",
  patrimonio_liquido: "Patrimônio Líquido",
  receita: "Resultado — Receita bruta",
  deducao_receita: "Resultado — Dedução da receita bruta",
  custo: "Resultado — Custo",
  despesa_operacional: "Resultado — Despesa operacional",
  receita_financeira: "Resultado — Receita financeira",
  despesa_financeira: "Resultado — Despesa financeira",
};

export function classificacaoDoGrupo(grupo: GrupoConta): string {
  return CLASSIFICACAO_DO_GRUPO[grupo];
}

/** Conta redutora: tem natureza contrária à do grupo em que aparece. */
export function ehContaRedutora(conta: Pick<Conta, "grupo" | "natureza" | "redutoraDe">): boolean {
  if (conta.redutoraDe !== null) return true;
  return conta.grupo === "patrimonio_liquido" && conta.natureza === "devedora";
}

/** Classificação completa da conta: grupo, subgrupo e, se for o caso, "conta redutora". */
export function classificacaoDaConta(
  conta: Pick<Conta, "grupo" | "natureza" | "redutoraDe">,
): string {
  const base = CLASSIFICACAO_DO_GRUPO[conta.grupo];
  return ehContaRedutora(conta) ? `${base} (conta redutora)` : base;
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
        classificacao: classificacaoDaConta(conta),
        direcao: valor > 0 ? ("aumenta" as const) : ("diminui" as const),
        valorCentavos: Math.abs(valor),
      };
    });
}
