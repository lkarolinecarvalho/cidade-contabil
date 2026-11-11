import { type DataJogo, exigirDataValida, type Periodo, primeiroDiaDoMes } from "./data";
import {
  type BalancoPatrimonial,
  balancoDosLancamentos,
  type DRE,
  dreDosLancamentos,
} from "./demonstracoes";
import type { Centavos } from "./dinheiro";
import { exigirInteiroPositivo } from "./dinheiro";
import { ErroDeOperacao } from "./erros";
import type { CodigoConta } from "./plano-de-contas";
import type { IdRegra } from "./regras";
import type { EstadoContabil, Lado, Lancamento, Partida } from "./tipos";

export type SituacaoDaLinha =
  /** Conta, lado e valor batem com o esperado. */
  | "correta"
  /** Conta e lado certos, valor diferente do esperado. */
  | "valor_incorreto"
  /** A conta faz parte do lançamento, mas no outro lado. */
  | "lado_incorreto"
  /** A conta não faz parte do lançamento esperado. */
  | "conta_inesperada";

export interface LinhaComparada {
  readonly informada: Partida;
  readonly situacao: SituacaoDaLinha;
  /** Total esperado para a conta e o lado corretos, quando a conta faz parte do lançamento. */
  readonly esperado: Partida | null;
  /** Regras que explicam a linha esperada, para o feedback. */
  readonly regras: readonly IdRegra[];
}

export interface LinhaFaltante {
  readonly esperado: Partida;
  readonly regras: readonly IdRegra[];
}

export interface ResultadoComparacao {
  /** Verdadeiro quando todas as linhas estão corretas e nenhuma falta. */
  readonly correto: boolean;
  /** Débitos = créditos no lançamento informado (R-GER-01). */
  readonly equilibrado: boolean;
  readonly totalDebitosCentavos: Centavos;
  readonly totalCreditosCentavos: Centavos;
  readonly linhas: readonly LinhaComparada[];
  /** Contas esperadas que o jogador não usou. */
  readonly faltantes: readonly LinhaFaltante[];
}

interface Grupo {
  readonly conta: CodigoConta;
  readonly lado: Lado;
  valorCentavos: Centavos;
  readonly regras: Set<IdRegra>;
}

const chave = (conta: CodigoConta, lado: Lado): string => `${conta}|${lado}`;
const outroLado = (lado: Lado): Lado => (lado === "D" ? "C" : "D");

function somarLado(partidas: readonly Partida[], lado: Lado): Centavos {
  return partidas.reduce((soma, p) => (p.lado === lado ? soma + p.valorCentavos : soma), 0);
}

/**
 * Compara o lançamento do jogador com o esperado pelo motor, linha a linha
 * (ADR-0005). A comparação é pelo total de cada conta em cada lado: dividir ou
 * juntar linhas da mesma conta não é erro.
 */
export function compararLancamento(
  esperado: readonly Lancamento[],
  informado: readonly Partida[],
): ResultadoComparacao {
  const grupos = new Map<string, Grupo>();
  for (const lancamento of esperado) {
    for (const partida of lancamento.partidas) {
      const k = chave(partida.conta, partida.lado);
      const grupo = grupos.get(k) ?? {
        conta: partida.conta,
        lado: partida.lado,
        valorCentavos: 0,
        regras: new Set<IdRegra>(),
      };
      grupo.valorCentavos += partida.valorCentavos;
      for (const regra of lancamento.regras) grupo.regras.add(regra);
      grupos.set(k, grupo);
    }
  }

  const informadoPorGrupo = new Map<string, Centavos>();
  for (const partida of informado) {
    const k = chave(partida.conta, partida.lado);
    informadoPorGrupo.set(k, (informadoPorGrupo.get(k) ?? 0) + partida.valorCentavos);
  }

  const paraPartida = (grupo: Grupo): Partida => ({
    conta: grupo.conta,
    lado: grupo.lado,
    valorCentavos: grupo.valorCentavos,
  });

  const linhas: LinhaComparada[] = informado.map((partida) => {
    const mesmoLado = grupos.get(chave(partida.conta, partida.lado));
    if (mesmoLado) {
      const totalInformado = informadoPorGrupo.get(chave(partida.conta, partida.lado)) ?? 0;
      return {
        informada: partida,
        situacao: totalInformado === mesmoLado.valorCentavos ? "correta" : "valor_incorreto",
        esperado: paraPartida(mesmoLado),
        regras: [...mesmoLado.regras],
      };
    }
    const ladoOposto = grupos.get(chave(partida.conta, outroLado(partida.lado)));
    if (ladoOposto) {
      return {
        informada: partida,
        situacao: "lado_incorreto",
        esperado: paraPartida(ladoOposto),
        regras: [...ladoOposto.regras],
      };
    }
    return { informada: partida, situacao: "conta_inesperada", esperado: null, regras: [] };
  });

  const contasInformadas = new Set(informado.map((p) => p.conta));
  const faltantes: LinhaFaltante[] = [...grupos.values()]
    .filter((grupo) => !contasInformadas.has(grupo.conta))
    .map((grupo) => ({ esperado: paraPartida(grupo), regras: [...grupo.regras] }));

  // Conta usada só no lado errado: o lado certo também não foi informado.
  const ladosCertosAusentes = [...grupos.values()].some(
    (grupo) => !informadoPorGrupo.has(chave(grupo.conta, grupo.lado)),
  );

  const totalDebitosCentavos = somarLado(informado, "D");
  const totalCreditosCentavos = somarLado(informado, "C");
  return {
    correto: linhas.every((l) => l.situacao === "correta") && !ladosCertosAusentes,
    equilibrado: totalDebitosCentavos === totalCreditosCentavos,
    totalDebitosCentavos,
    totalCreditosCentavos,
    linhas,
    faltantes,
  };
}

export type PreviaDoErro =
  | {
      readonly equilibrado: true;
      readonly dre: DRE;
      readonly balanco: BalancoPatrimonial;
    }
  /** Lançamento desequilibrado não gera prévia, só o aviso de débitos ≠ créditos. */
  | {
      readonly equilibrado: false;
      readonly totalDebitosCentavos: Centavos;
      readonly totalCreditosCentavos: Centavos;
    };

/**
 * Prévia do erro (ADR-0005): como ficariam a DRE e o Balanço se o lançamento do
 * jogador fosse gravado. Nunca grava: o estado recebido não é alterado.
 * A DRE cobre o período informado ou, por padrão, do dia 1 do mês até a data.
 */
export function simularLancamentoInformado(
  estado: EstadoContabil,
  informado: readonly Partida[],
  data: DataJogo,
  periodo: Periodo = { de: primeiroDiaDoMes(data), ate: data },
): PreviaDoErro {
  exigirDataValida(data);
  const contas = new Set(estado.planoDeContas.contas.map((c) => c.codigo));
  for (const partida of informado) {
    if (!contas.has(partida.conta)) {
      throw new ErroDeOperacao("valor_invalido", `Conta inexistente no plano: ${partida.conta}.`);
    }
    exigirInteiroPositivo(partida.valorCentavos, "Valor da linha");
  }

  const totalDebitosCentavos = somarLado(informado, "D");
  const totalCreditosCentavos = somarLado(informado, "C");
  if (totalDebitosCentavos !== totalCreditosCentavos) {
    return { equilibrado: false, totalDebitosCentavos, totalCreditosCentavos };
  }

  // Cópia descartável do razão: o lançamento simulado nunca entra em `estado`.
  const simulados: Lancamento[] = [
    ...estado.lancamentos,
    {
      id: estado.lancamentos.length + 1,
      data,
      operacao: "simulacao",
      historico: "Lançamento informado pelo jogador (prévia)",
      regras: [],
      partidas: informado,
    },
  ];
  return {
    equilibrado: true,
    dre: dreDosLancamentos(estado.planoDeContas, simulados, periodo),
    balanco: balancoDosLancamentos(estado.planoDeContas, simulados, data),
  };
}
