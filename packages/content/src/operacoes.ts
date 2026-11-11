import type { MeioDePagamento, MesJogo, Operacao } from "@cidade/ledger";
import { type OperacaoDeMissao, TOTAL_EM_PONTOS_BASE } from "./schemas";

export interface ContextoDaOperacao {
  /** Mês corrente do jogo, para a depreciação e a apuração do ICMS. */
  readonly mes: MesJogo;
  /** Meio que o jogador escolheu, quando a missão deixa a escolha com ele. */
  readonly meioEscolhido?: MeioDePagamento;
}

/**
 * Converte a operação declarada na missão na operação de domínio do motor.
 * O lançamento continua sendo calculado pelo ledger (ADR-0005).
 */
export function paraOperacaoDoMotor(
  operacao: OperacaoDeMissao,
  contexto: ContextoDaOperacao,
): Operacao {
  switch (operacao.tipo) {
    case "subscricao":
      // R-CAP-05: o motor registra o total; as participações ficam fora do razão.
      return { tipo: "subscricao", valorCentavos: operacao.valorCentavos };
    case "compra": {
      if (operacao.condicao.tipo === "prazo") return { ...operacao, condicao: operacao.condicao };
      const meio =
        operacao.condicao.meio === "escolha_do_jogador"
          ? contexto.meioEscolhido
          : operacao.condicao.meio;
      if (!meio) throw new Error("A compra à vista depende do meio escolhido pelo jogador.");
      return { ...operacao, condicao: { tipo: "avista", meio } };
    }
    case "depreciacao":
      return { tipo: "depreciacao", mes: contexto.mes };
    case "apuracao_icms":
      return { tipo: "apuracao_icms", mes: contexto.mes };
    default:
      return operacao;
  }
}

/**
 * Parte de um acionista num valor, em centavos inteiros (R-CAP-05, R-ENT-02).
 * Lança erro se a divisão não for exata: o conteúdo deve usar valores que fechem.
 */
export function parteDoAcionista(valorCentavos: number, participacaoEmPontosBase: number): number {
  const numerador = valorCentavos * participacaoEmPontosBase;
  if (!Number.isSafeInteger(numerador) || numerador % TOTAL_EM_PONTOS_BASE !== 0) {
    throw new Error("A participação não divide o valor em centavos inteiros.");
  }
  return numerador / TOTAL_EM_PONTOS_BASE;
}
