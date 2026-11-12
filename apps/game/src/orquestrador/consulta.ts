import {
  type Centavos,
  type CodigoConta,
  type Conta,
  type DataJogo,
  type EstadoContabil,
  type GrupoConta,
  type Lado,
  saldos,
} from "@cidade/ledger";
import { classificacaoDoGrupo, ehContaRedutora } from "./efeito";

/** Consulta do Escritório: Plano de Contas, Diário e Razão, lidos do razão da empresa. */

/** Ordem dos grupos no Plano de Contas: primeiro o Balanço, depois o resultado. */
const ORDEM_DOS_GRUPOS: readonly GrupoConta[] = [
  "ativo_circulante",
  "imobilizado",
  "passivo_circulante",
  "patrimonio_liquido",
  "receita",
  "deducao_receita",
  "custo",
  "despesa_operacional",
  "receita_financeira",
  "despesa_financeira",
];

export interface ContaDoPlano {
  readonly codigo: CodigoConta;
  readonly nome: string;
  readonly natureza: Conta["natureza"];
  readonly redutora: boolean;
  /** Saldo no lado da natureza da conta. */
  readonly saldoCentavos: Centavos;
}

export interface GrupoDoPlano {
  readonly grupo: GrupoConta;
  readonly classificacao: string;
  readonly contas: readonly ContaDoPlano[];
}

/** O plano de contas por grupo, com o saldo atual de cada conta. */
export function planoPorGrupo(contabil: EstadoContabil): GrupoDoPlano[] {
  const saldoDe = new Map(saldos(contabil).map((s) => [s.conta, s.saldoCentavos]));
  return ORDEM_DOS_GRUPOS.map((grupo) => ({
    grupo,
    classificacao: classificacaoDoGrupo(grupo),
    contas: contabil.planoDeContas.contas
      .filter((c) => c.grupo === grupo)
      .map((c) => ({
        codigo: c.codigo,
        nome: c.nome,
        natureza: c.natureza,
        redutora: ehContaRedutora(c),
        saldoCentavos: saldoDe.get(c.codigo) ?? 0,
      })),
  })).filter((g) => g.contas.length > 0);
}

export interface PartidaDoDiario {
  readonly lado: Lado;
  readonly conta: string;
  readonly valorCentavos: Centavos;
}

export interface RegistroDoDiario {
  readonly id: number;
  readonly data: DataJogo;
  readonly historico: string;
  readonly partidas: readonly PartidaDoDiario[];
}

/** O Diário: todos os lançamentos, do mais recente para o mais antigo. */
export function diario(contabil: EstadoContabil): RegistroDoDiario[] {
  const nomes = new Map(contabil.planoDeContas.contas.map((c) => [c.codigo, c.nome]));
  return contabil.lancamentos
    .map((lancamento) => ({
      id: lancamento.id,
      data: lancamento.data,
      historico: lancamento.historico,
      partidas: lancamento.partidas.map((p) => ({
        lado: p.lado,
        conta: nomes.get(p.conta) ?? p.conta,
        valorCentavos: p.valorCentavos,
      })),
    }))
    .reverse();
}

export interface MovimentoDoRazao {
  readonly id: number;
  readonly data: DataJogo;
  readonly historico: string;
  readonly lado: Lado;
  readonly valorCentavos: Centavos;
}

export interface RazaoDaConta {
  readonly codigo: CodigoConta;
  readonly nome: string;
  readonly natureza: Conta["natureza"];
  readonly movimentos: readonly MovimentoDoRazao[];
  readonly totalDebitosCentavos: Centavos;
  readonly totalCreditosCentavos: Centavos;
  /** Saldo final e o lado em que ele fica. `null` quando a conta está zerada. */
  readonly saldoCentavos: Centavos;
  readonly ladoDoSaldo: Lado | null;
}

/** O Razão de uma conta: os débitos e os créditos em ordem, e o saldo. */
export function razaoDaConta(contabil: EstadoContabil, codigo: CodigoConta): RazaoDaConta | null {
  const conta = contabil.planoDeContas.contas.find((c) => c.codigo === codigo);
  if (!conta) return null;
  const movimentos = contabil.lancamentos.flatMap((lancamento) =>
    lancamento.partidas
      .filter((p) => p.conta === codigo)
      .map((p) => ({
        id: lancamento.id,
        data: lancamento.data,
        historico: lancamento.historico,
        lado: p.lado,
        valorCentavos: p.valorCentavos,
      })),
  );
  const total = (lado: Lado) =>
    movimentos.reduce((soma, m) => (m.lado === lado ? soma + m.valorCentavos : soma), 0);
  const debitos = total("D");
  const creditos = total("C");
  return {
    codigo,
    nome: conta.nome,
    natureza: conta.natureza,
    movimentos,
    totalDebitosCentavos: debitos,
    totalCreditosCentavos: creditos,
    saldoCentavos: Math.abs(debitos - creditos),
    ladoDoSaldo: debitos === creditos ? null : debitos > creditos ? "D" : "C",
  };
}

/** Contas que já tiveram movimento, na ordem do plano: as que têm Razão para mostrar. */
export function contasComMovimento(contabil: EstadoContabil): Conta[] {
  const usadas = new Set(contabil.lancamentos.flatMap((l) => l.partidas.map((p) => p.conta)));
  return contabil.planoDeContas.contas.filter((c) => usadas.has(c.codigo));
}
