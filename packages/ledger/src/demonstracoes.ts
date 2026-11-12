import { compararDatas, type DataJogo, type Periodo } from "./data";
import type { Centavos } from "./dinheiro";
import type { CodigoConta, GrupoConta, PlanoDeContas } from "./plano-de-contas";
import { ehContaDeResultado } from "./plano-de-contas";
import { acumularMovimentos, ateAData, saldoCredor, saldoDevedor } from "./razao";
import type { EstadoContabil, Lancamento } from "./tipos";

export interface LinhaDeDemonstracao {
  readonly conta: CodigoConta;
  readonly nome: string;
  readonly valorCentavos: Centavos;
}

/** R-DEM-02. Deduções, custos e despesas vêm como valores positivos a subtrair. */
export interface DRE {
  readonly receitaBruta: readonly LinhaDeDemonstracao[];
  readonly totalReceitaBrutaCentavos: Centavos;
  readonly deducoes: readonly LinhaDeDemonstracao[];
  readonly totalDeducoesCentavos: Centavos;
  readonly receitaLiquidaCentavos: Centavos;
  readonly custos: readonly LinhaDeDemonstracao[];
  readonly totalCustosCentavos: Centavos;
  readonly lucroBrutoCentavos: Centavos;
  readonly despesasOperacionais: readonly LinhaDeDemonstracao[];
  readonly totalDespesasOperacionaisCentavos: Centavos;
  /** R-DSC-02, R-DSC-04: descontos financeiros obtidos e concedidos. */
  readonly receitasFinanceiras: readonly LinhaDeDemonstracao[];
  readonly despesasFinanceiras: readonly LinhaDeDemonstracao[];
  /** Receitas financeiras − despesas financeiras. */
  readonly resultadoFinanceiroCentavos: Centavos;
  /** Positivo = lucro; negativo = prejuízo. */
  readonly resultadoCentavos: Centavos;
}

function total(linhas: readonly LinhaDeDemonstracao[]): Centavos {
  return linhas.reduce((soma, linha) => soma + linha.valorCentavos, 0);
}

export function dreDosLancamentos(
  plano: PlanoDeContas,
  lancamentos: readonly Lancamento[],
  periodo: Periodo,
): DRE {
  // O encerramento (R-DEM-04) zera as contas de resultado e não é movimento do período.
  const movimentos = acumularMovimentos(
    lancamentos,
    (l) =>
      l.operacao !== "encerramento" &&
      compararDatas(l.data, periodo.de) >= 0 &&
      compararDatas(l.data, periodo.ate) <= 0,
  );
  const doGrupo = (grupo: GrupoConta): LinhaDeDemonstracao[] =>
    plano.contas
      // As contas de uso eventual só aparecem quando têm movimento no período.
      .filter((c) => c.grupo === grupo && (!c.eventual || movimentos.has(c.codigo)))
      .map((c) => ({
        conta: c.codigo,
        nome: c.nome,
        valorCentavos:
          c.natureza === "credora"
            ? saldoCredor(movimentos, c.codigo)
            : saldoDevedor(movimentos, c.codigo),
      }));

  const receitaBruta = doGrupo("receita");
  const deducoes = doGrupo("deducao_receita");
  const custos = doGrupo("custo");
  const despesasOperacionais = doGrupo("despesa_operacional");
  const receitasFinanceiras = doGrupo("receita_financeira");
  const despesasFinanceiras = doGrupo("despesa_financeira");
  const resultadoFinanceiroCentavos = total(receitasFinanceiras) - total(despesasFinanceiras);
  const receitaLiquidaCentavos = total(receitaBruta) - total(deducoes);
  const lucroBrutoCentavos = receitaLiquidaCentavos - total(custos);
  return {
    receitaBruta,
    totalReceitaBrutaCentavos: total(receitaBruta),
    deducoes,
    totalDeducoesCentavos: total(deducoes),
    receitaLiquidaCentavos,
    custos,
    totalCustosCentavos: total(custos),
    lucroBrutoCentavos,
    despesasOperacionais,
    totalDespesasOperacionaisCentavos: total(despesasOperacionais),
    receitasFinanceiras,
    despesasFinanceiras,
    resultadoFinanceiroCentavos,
    resultadoCentavos:
      lucroBrutoCentavos - total(despesasOperacionais) + resultadoFinanceiroCentavos,
  };
}

/** R-DEM-02: Demonstração do Resultado do período (datas inclusivas). */
export function dre(estado: EstadoContabil, periodo: Periodo): DRE {
  return dreDosLancamentos(estado.planoDeContas, estado.lancamentos, periodo);
}

export interface LinhaDoImobilizado extends LinhaDeDemonstracao {
  readonly custoCentavos: Centavos;
  readonly depreciacaoAcumuladaCentavos: Centavos;
}

/** R-DEM-03. */
export interface BalancoPatrimonial {
  readonly ativo: {
    readonly circulante: readonly LinhaDeDemonstracao[];
    readonly totalCirculanteCentavos: Centavos;
    /** Imobilizado pelo líquido: custo − depreciação acumulada. */
    readonly imobilizado: readonly LinhaDoImobilizado[];
    readonly totalNaoCirculanteCentavos: Centavos;
    readonly totalCentavos: Centavos;
  };
  readonly passivo: {
    readonly circulante: readonly LinhaDeDemonstracao[];
    readonly totalCirculanteCentavos: Centavos;
  };
  readonly patrimonioLiquido: {
    /** Contas redutoras (ex.: Capital a Integralizar) vêm com valor negativo (R-CAP-04). */
    readonly contas: readonly LinhaDeDemonstracao[];
    /** Capital Social líquido: subscrito − a integralizar (R-CAP-04). */
    readonly capitalSocialCentavos: Centavos;
    /** Resultado ainda não encerrado: positivo = lucro; negativo = prejuízo. */
    readonly resultadoDoPeriodoCentavos: Centavos;
    readonly totalCentavos: Centavos;
  };
  readonly totalPassivoEPatrimonioLiquidoCentavos: Centavos;
}

export function balancoDosLancamentos(
  plano: PlanoDeContas,
  lancamentos: readonly Lancamento[],
  data: DataJogo,
): BalancoPatrimonial {
  const movimentos = acumularMovimentos(lancamentos, ateAData(data));
  const linha = (codigo: CodigoConta, nome: string, valorCentavos: Centavos) => ({
    conta: codigo,
    nome,
    valorCentavos,
  });

  // As contas de uso eventual só aparecem depois do primeiro movimento.
  const mostrar = (c: { eventual: boolean; codigo: CodigoConta }) =>
    !c.eventual || movimentos.has(c.codigo);

  const circulante = plano.contas
    .filter((c) => c.grupo === "ativo_circulante" && mostrar(c))
    .map((c) => linha(c.codigo, c.nome, saldoDevedor(movimentos, c.codigo)));

  const imobilizado = plano.contas
    .filter((c) => c.grupo === "imobilizado" && c.redutoraDe === null)
    .map((c) => {
      const custoCentavos = saldoDevedor(movimentos, c.codigo);
      const depreciacaoAcumuladaCentavos = plano.contas
        .filter((redutora) => redutora.redutoraDe === c.codigo)
        .reduce((soma, redutora) => soma + saldoCredor(movimentos, redutora.codigo), 0);
      return {
        ...linha(c.codigo, c.nome, custoCentavos - depreciacaoAcumuladaCentavos),
        custoCentavos,
        depreciacaoAcumuladaCentavos,
      };
    });

  const passivoCirculante = plano.contas
    .filter((c) => c.grupo === "passivo_circulante" && mostrar(c))
    .map((c) => linha(c.codigo, c.nome, saldoCredor(movimentos, c.codigo)));

  const contasDoPl = plano.contas
    .filter((c) => c.grupo === "patrimonio_liquido")
    .map((c) => linha(c.codigo, c.nome, saldoCredor(movimentos, c.codigo)));

  // R-DEM-03: o resultado ainda não encerrado aparece no PL como "Resultado do período".
  const resultadoDoPeriodoCentavos = plano.contas
    .filter(ehContaDeResultado)
    .reduce((soma, c) => soma + saldoCredor(movimentos, c.codigo), 0);

  const totalCirculanteCentavos = total(circulante);
  const totalNaoCirculanteCentavos = total(imobilizado);
  const totalPassivoCirculanteCentavos = total(passivoCirculante);
  const totalDoPl = total(contasDoPl) + resultadoDoPeriodoCentavos;
  return {
    ativo: {
      circulante,
      totalCirculanteCentavos,
      imobilizado,
      totalNaoCirculanteCentavos,
      totalCentavos: totalCirculanteCentavos + totalNaoCirculanteCentavos,
    },
    passivo: {
      circulante: passivoCirculante,
      totalCirculanteCentavos: totalPassivoCirculanteCentavos,
    },
    patrimonioLiquido: {
      contas: contasDoPl,
      capitalSocialCentavos:
        saldoCredor(movimentos, plano.papeis.capitalSubscrito) -
        saldoDevedor(movimentos, plano.papeis.capitalAIntegralizar),
      resultadoDoPeriodoCentavos,
      totalCentavos: totalDoPl,
    },
    totalPassivoEPatrimonioLiquidoCentavos: totalPassivoCirculanteCentavos + totalDoPl,
  };
}

/** R-DEM-03: Balanço Patrimonial na data (inclusive). */
export function balanco(estado: EstadoContabil, data: DataJogo): BalancoPatrimonial {
  return balancoDosLancamentos(estado.planoDeContas, estado.lancamentos, data);
}
