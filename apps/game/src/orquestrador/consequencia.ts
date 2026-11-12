import {
  type EstadoContabil,
  type Operacao,
  preverLancamentos,
  saldos,
  type ValoresCalculados,
} from "@cidade/ledger";
import { classificacaoDaConta } from "./efeito";

/** Saldo de uma conta antes e depois da missão. */
export interface MudancaDeSaldo {
  readonly conta: string;
  readonly nome: string;
  readonly classificacao: string;
  readonly antesCentavos: number;
  readonly depoisCentavos: number;
}

/**
 * A consequência da missão: as contas cujo saldo mudou, com o valor de antes e o de
 * depois, na ordem do plano de contas. O saldo é o do lado da natureza de cada conta.
 */
export function oQueMudou(antes: EstadoContabil, depois: EstadoContabil): MudancaDeSaldo[] {
  const saldosDeAntes = new Map(saldos(antes).map((s) => [s.conta, s.saldoCentavos]));
  const saldosDeDepois = new Map(saldos(depois).map((s) => [s.conta, s.saldoCentavos]));
  return depois.planoDeContas.contas
    .map((conta) => ({
      conta: conta.codigo,
      nome: conta.nome,
      classificacao: classificacaoDaConta(conta),
      antesCentavos: saldosDeAntes.get(conta.codigo) ?? 0,
      depoisCentavos: saldosDeDepois.get(conta.codigo) ?? 0,
    }))
    .filter((mudanca) => mudanca.antesCentavos !== mudanca.depoisCentavos);
}

type Compra = Extract<Operacao, { tipo: "compra" }>;

/** Uma linha da comparação entre duas notas de compra. */
export interface LinhaDaComparacao {
  readonly rotulo: string;
  readonly la: string;
  readonly aqui: string;
  /** Os dois lados diferem: é aqui que o tratamento muda. */
  readonly mudou: boolean;
}

/** Valores da nota, calculados pelo motor sem gravar nada. */
function valoresDaCompra(estado: EstadoContabil, compra: Compra): ValoresCalculados {
  // A nota já lançada não pode ser registrada de novo, e o dinheiro em conta não
  // interessa à comparação: a prévia é feita sem identificador e a prazo.
  const { nota: _nota, ...semNota } = compra;
  const previa: Compra = { ...semNota, condicao: { tipo: "prazo", dias: 30 } };
  const ultimoDia = estado.lancamentos.at(-1)?.data ?? { ano: 1, mes: 1, dia: 1 };
  return preverLancamentos(estado, previa, ultimoDia).valores;
}

/**
 * Compara duas notas de compra, lado a lado: o que cada uma traz, o que volta como
 * crédito e quanto entra no estoque. Todos os valores vêm do motor.
 */
export function compararCompras(
  estado: EstadoContabil,
  la: Compra,
  aqui: Compra,
  reais: (centavos: number) => string,
): LinhaDaComparacao[] {
  const a = valoresDaCompra(estado, la);
  const b = valoresDaCompra(estado, aqui);
  const dinheiro = (valor: number | undefined) => reais(valor ?? 0);
  const volta = (valor: number | undefined) => ((valor ?? 0) > 0 ? reais(valor ?? 0) : "não volta");
  const ipiNaBase = (v: ValoresCalculados) => {
    if ((v.ipi ?? 0) === 0) return "não há IPI";
    return (v.baseIcms ?? 0) > (v.produtos ?? 0) ? "sim" : "não";
  };
  const linhas: readonly (readonly [string, string, string])[] = [
    ["Valor dos produtos", dinheiro(a.produtos), dinheiro(b.produtos)],
    ["IPI, por fora", dinheiro(a.ipi), dinheiro(b.ipi)],
    ["Total da nota", dinheiro(a.totalNota), dinheiro(b.totalNota)],
    ["IPI entra na base do ICMS?", ipiNaBase(a), ipiNaBase(b)],
    ["Base do ICMS", dinheiro(a.baseIcms), dinheiro(b.baseIcms)],
    ["ICMS destacado", dinheiro(a.icmsDestacado), dinheiro(b.icmsDestacado)],
    ["ICMS que volta", volta(a.icms), volta(b.icms)],
    ["IPI que volta", volta(a.ipiRecuperado), volta(b.ipiRecuperado)],
    ["Custo que entra no estoque", dinheiro(a.custoEstoque), dinheiro(b.custoEstoque)],
  ];
  // As linhas de valor só "mudam" quando o tratamento muda, e não porque os preços diferem.
  const DE_TRATAMENTO = new Set(["IPI entra na base do ICMS?", "ICMS que volta", "IPI que volta"]);
  return linhas.map(([rotulo, valorLa, valorAqui]) => ({
    rotulo,
    la: valorLa,
    aqui: valorAqui,
    mudou:
      rotulo === "IPI entra na base do ICMS?"
        ? valorLa !== valorAqui
        : DE_TRATAMENTO.has(rotulo) && (valorLa === "não volta") !== (valorAqui === "não volta"),
  }));
}
