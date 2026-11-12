import type { MeioDePagamento, MesJogo, Operacao } from "@cidade/ledger";
import { type OperacaoDeMissao, TOTAL_EM_PONTOS_BASE } from "./schemas";

export interface ContextoDaOperacao {
  /** Mês corrente do jogo, para a depreciação e as apurações do ICMS e do IPI. */
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
      const { condicao, nota, descontoComercial, ipiRecuperavel, ...resto } = operacao;
      // Campos opcionais só entram quando existem.
      const opcionais = {
        ...(nota !== undefined ? { nota } : {}),
        ...(descontoComercial !== undefined ? { descontoComercial } : {}),
        ...(ipiRecuperavel !== undefined ? { ipiRecuperavel } : {}),
      };
      if (condicao.tipo === "prazo") return { ...resto, ...opcionais, condicao };
      const meio = condicao.meio === "escolha_do_jogador" ? contexto.meioEscolhido : condicao.meio;
      if (!meio) throw new Error("A compra à vista depende do meio escolhido pelo jogador.");
      return { ...resto, ...opcionais, condicao: { tipo: "avista", meio } };
    }
    case "venda": {
      const { nota, descontoIncondicional, ipiAliquota, ...resto } = operacao;
      return {
        ...resto,
        ...(nota !== undefined ? { nota } : {}),
        ...(descontoIncondicional !== undefined ? { descontoIncondicional } : {}),
        ...(ipiAliquota !== undefined ? { ipiAliquota } : {}),
      };
    }
    case "recebimento":
    case "pagamento": {
      const { descontoFinanceiroCentavos, ...resto } = operacao;
      return {
        ...resto,
        ...(descontoFinanceiroCentavos !== undefined ? { descontoFinanceiroCentavos } : {}),
      };
    }
    case "depreciacao":
      return { tipo: "depreciacao", mes: contexto.mes };
    case "apuracao_icms":
      return { tipo: "apuracao_icms", mes: contexto.mes };
    case "apuracao_ipi":
      return { tipo: "apuracao_ipi", mes: contexto.mes };
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
