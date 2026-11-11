import { compararDatas, compararMeses, type DataJogo, exigirDataValida, mesmoMes } from "./data";
import {
  aplicarAliquota,
  type Centavos,
  exigirInteiroNaoNegativo,
  exigirInteiroPositivo,
  multiplicarEDividir,
} from "./dinheiro";
import { ErroDeOperacao } from "./erros";
import { ESTOQUE_VAZIO, entradaNoEstoque, saidaDoEstoque } from "./estoque";
import { PARAMETROS_PADRAO, type Parametros } from "./parametros";
import {
  type ClasseDepreciavel,
  type CodigoConta,
  ehContaDeResultado,
  PLANO_DE_CONTAS_V1,
  type PlanoDeContas,
} from "./plano-de-contas";
import { acumularMovimentos, type Movimentos, saldoCredor, saldoDevedor } from "./razao";
import type { IdRegra } from "./regras";
import type {
  Bem,
  EstadoContabil,
  ItemMercadoria,
  Lancamento,
  MeioDePagamento,
  Operacao,
  Partida,
  Previsao,
  SaldoDeEstoque,
  ValoresCalculados,
} from "./tipos";

export interface ParametrosDaEmpresa {
  readonly parametros?: Parametros;
  readonly planoDeContas?: PlanoDeContas;
}

/** Cria a empresa com o razão vazio. A carteira pessoal do avatar fica fora (R-ENT-01). */
export function criarEmpresa(opcoes: ParametrosDaEmpresa = {}): EstadoContabil {
  return {
    versaoSchema: 1,
    parametros: opcoes.parametros ?? PARAMETROS_PADRAO,
    planoDeContas: opcoes.planoDeContas ?? PLANO_DE_CONTAS_V1,
    lancamentos: [],
    estoque: {},
    imobilizado: [],
  };
}

interface Rascunho {
  readonly historico: string;
  readonly regras: readonly IdRegra[];
  readonly partidas: readonly Partida[];
}

interface Calculo {
  readonly rascunhos: readonly Rascunho[];
  readonly estoque: Readonly<Record<string, SaldoDeEstoque>>;
  readonly imobilizado: readonly Bem[];
  readonly valores: ValoresCalculados;
}

const debito = (conta: CodigoConta, valorCentavos: Centavos): Partida => ({
  conta,
  lado: "D",
  valorCentavos,
});

const credito = (conta: CodigoConta, valorCentavos: Centavos): Partida => ({
  conta,
  lado: "C",
  valorCentavos,
});

/** Monta um lançamento, descartando partidas de valor zero (ex.: ICMS com alíquota 0). */
function rascunho(
  historico: string,
  regras: readonly IdRegra[],
  partidas: readonly Partida[],
): Rascunho {
  return { historico, regras, partidas: partidas.filter((p) => p.valorCentavos !== 0) };
}

const CLASSES_DEPRECIAVEIS: readonly ClasseDepreciavel[] = [
  "edificacoes",
  "moveis_utensilios",
  "equipamentos",
];

/** As regras não definem o rateio de frete e tributos entre produtos: o motor não inventa. */
function itemUnico(itens: readonly ItemMercadoria[], operacao: string): ItemMercadoria {
  const [item, ...outros] = itens;
  if (!item || outros.length > 0) {
    throw new ErroDeOperacao(
      "caso_nao_coberto",
      `A ${operacao} deve ter exatamente um produto: as regras não cobrem o rateio entre produtos.`,
    );
  }
  exigirInteiroPositivo(item.quantidade, "Quantidade");
  exigirInteiroPositivo(item.precoUnitarioCentavos, "Preço unitário");
  return item;
}

function exigirPrazoValido(dias: number): void {
  exigirInteiroPositivo(dias, "Prazo em dias");
}

function calcular(estado: EstadoContabil, operacao: Operacao, data: DataJogo): Calculo {
  const { papeis } = estado.planoDeContas;
  const { parametros } = estado;
  const movimentos: Movimentos = acumularMovimentos(estado.lancamentos);
  const contaDoMeio = (meio: MeioDePagamento): CodigoConta =>
    meio === "caixa" ? papeis.caixa : papeis.bancos;
  const semMudanca = { estoque: estado.estoque, imobilizado: estado.imobilizado, valores: {} };

  switch (operacao.tipo) {
    case "subscricao": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor subscrito");
      return {
        ...semMudanca,
        rascunhos: [
          // R-CAP-03
          rascunho(
            "Subscrição de capital social",
            ["R-CAP-03"],
            [
              debito(papeis.capitalAIntegralizar, operacao.valorCentavos),
              credito(papeis.capitalSubscrito, operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "integralizacao": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor integralizado");
      const aIntegralizar = saldoDevedor(movimentos, papeis.capitalAIntegralizar);
      if (operacao.valorCentavos > aIntegralizar) {
        throw new ErroDeOperacao(
          "excede_saldo",
          "A integralização não pode ser maior que o capital a integralizar.",
          "R-CAP-03",
        );
      }
      return {
        ...semMudanca,
        rascunhos: [
          // R-CAP-03, R-CAP-05, R-ENT-02: o motor registra a integralização total;
          // a parte de cada acionista e a carteira pessoal ficam fora do razão.
          rascunho(
            "Integralização de capital social",
            ["R-CAP-03", "R-CAP-05", "R-ENT-02"],
            [
              debito(contaDoMeio(operacao.meio), operacao.valorCentavos),
              credito(papeis.capitalAIntegralizar, operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "deposito": {
      // Sem ID de regra no documento: segue a Op 2 de docs/cenario-referencia.md.
      exigirInteiroPositivo(operacao.valorCentavos, "Valor do depósito");
      return {
        ...semMudanca,
        rascunhos: [
          rascunho(
            "Depósito do caixa no banco",
            [],
            [
              debito(papeis.bancos, operacao.valorCentavos),
              credito(papeis.caixa, operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "compra_imobilizado": {
      if (operacao.itens.length === 0) {
        throw new ErroDeOperacao("valor_invalido", "A compra de imobilizado não tem itens.");
      }
      for (const item of operacao.itens) {
        exigirInteiroPositivo(item.valorCentavos, "Valor do bem");
      }
      const total = operacao.itens.reduce((soma, item) => soma + item.valorCentavos, 0);
      const classes = new Set(operacao.itens.map((item) => item.classe));
      const regras: IdRegra[] = [];
      // R-IMO-02, R-IMO-04: imóvel de uso próprio; terreno e edificação separados.
      if (classes.has("terrenos") || classes.has("edificacoes"))
        regras.push("R-IMO-02", "R-IMO-04");
      // R-IMO-05: móveis, utensílios e equipamentos de uso próprio.
      if (classes.has("moveis_utensilios") || classes.has("equipamentos")) regras.push("R-IMO-05");
      // R-IMO-06 📘: sem ICMS destacado; o valor já inclui ITBI e registro.
      regras.push("R-IMO-06");
      return {
        estoque: estado.estoque,
        valores: {},
        imobilizado: [
          ...estado.imobilizado,
          // R-DEP-03: o bem entra em uso no mês da aquisição.
          ...operacao.itens.map((item) => ({
            classe: item.classe,
            custoCentavos: item.valorCentavos,
            emUsoDesde: { ano: data.ano, mes: data.mes },
          })),
        ],
        rascunhos: [
          rascunho("Aquisição de imobilizado à vista", regras, [
            ...operacao.itens.map((item) =>
              debito(papeis.imobilizado[item.classe], item.valorCentavos),
            ),
            credito(contaDoMeio(operacao.meio), total),
          ]),
        ],
      };
    }

    case "compra": {
      const item = itemUnico(operacao.itens, "compra");
      exigirInteiroNaoNegativo(operacao.ipiAliquota, "Alíquota do IPI");
      exigirInteiroNaoNegativo(operacao.freteCentavos, "Frete");
      if (operacao.condicao.tipo === "prazo") exigirPrazoValido(operacao.condicao.dias);

      const produtos = item.quantidade * item.precoUnitarioCentavos;
      // R-IPI-01, R-IPI-02: o IPI vem na oferta e integra o custo (comerciante não recupera).
      const ipi = aplicarAliquota(produtos, operacao.ipiAliquota);
      // R-FRE-01: o frete cobrado na nota integra o total, o custo e a base do ICMS.
      const totalNota = produtos + ipi + operacao.freteCentavos;
      // R-ICMS-02, R-ICMS-03: ICMS por dentro; base = produtos + frete, sem o IPI.
      const icms = aplicarAliquota(produtos + operacao.freteCentavos, parametros.icmsAliquota);
      // R-COM-01: custo = produtos + IPI + frete − ICMS recuperável.
      const custo = totalNota - icms;
      // R-COM-02: à vista credita Caixa ou Bancos; a prazo credita Fornecedores.
      const contrapartida =
        operacao.condicao.tipo === "avista"
          ? contaDoMeio(operacao.condicao.meio)
          : papeis.fornecedores;
      const regras: IdRegra[] = [
        "R-COM-01",
        "R-COM-02",
        "R-COM-03",
        "R-COM-04",
        "R-ICMS-02",
        "R-ICMS-03",
        "R-ICMS-04",
      ];
      if (ipi > 0) regras.push("R-IPI-01");
      if (operacao.freteCentavos > 0) regras.push("R-FRE-01");
      return {
        imobilizado: estado.imobilizado,
        // R-EST-01, R-EST-02: a entrada atualiza quantidade e valor na hora.
        estoque: {
          ...estado.estoque,
          [item.produto]: entradaNoEstoque(
            estado.estoque[item.produto] ?? ESTOQUE_VAZIO,
            item.quantidade,
            custo,
          ),
        },
        valores: { totalNota, ipi, icms, custoEstoque: custo },
        rascunhos: [
          // R-COM-03, R-ICMS-04
          rascunho(
            operacao.condicao.tipo === "avista"
              ? "Compra de mercadorias à vista"
              : "Compra de mercadorias a prazo",
            regras,
            [
              debito(papeis.estoque, custo),
              debito(papeis.icmsARecuperar, icms),
              credito(contrapartida, totalNota),
            ],
          ),
        ],
      };
    }

    case "venda": {
      const item = itemUnico(operacao.itens, "venda");
      if (operacao.condicao.tipo === "prazo") exigirPrazoValido(operacao.condicao.dias);

      const receita = item.quantidade * item.precoUnitarioCentavos;
      // R-ICMS-02: ICMS por dentro, sobre o valor da operação.
      const icms = aplicarAliquota(receita, parametros.icmsAliquota);
      // R-PC-02: base do PIS/COFINS = receita bruta − ICMS destacado.
      const basePisCofins = receita - icms;
      // R-PC-01: regime cumulativo.
      const pis = aplicarAliquota(basePisCofins, parametros.pisAliquota);
      const cofins = aplicarAliquota(basePisCofins, parametros.cofinsAliquota);
      // R-EST-03, R-EST-04
      const saida = saidaDoEstoque(estado.estoque[item.produto] ?? ESTOQUE_VAZIO, item.quantidade);
      const aVista = operacao.condicao.tipo === "avista";
      return {
        imobilizado: estado.imobilizado,
        estoque: { ...estado.estoque, [item.produto]: saida.saldo },
        valores: { receitaBruta: receita, icms, pis, cofins, cmv: saida.cmvCentavos },
        rascunhos: [
          // R-VEN-01; R-GER-03: a receita é reconhecida na venda, recebida ou não.
          rascunho(
            aVista ? "Venda de mercadorias à vista" : "Venda de mercadorias a prazo",
            ["R-VEN-01", "R-GER-03"],
            [
              debito(aVista ? papeis.caixa : papeis.clientes, receita),
              credito(papeis.receitaBruta, receita),
            ],
          ),
          // R-ICMS-05
          rascunho(
            "ICMS sobre a venda",
            ["R-ICMS-05", "R-ICMS-02", "R-VEN-02"],
            [debito(papeis.icmsSobreVendas, icms), credito(papeis.icmsARecolher, icms)],
          ),
          // R-PC-03
          rascunho(
            "PIS sobre a venda",
            ["R-PC-03", "R-PC-01", "R-PC-02", "R-VEN-02"],
            [debito(papeis.pisSobreFaturamento, pis), credito(papeis.pisARecolher, pis)],
          ),
          rascunho(
            "COFINS sobre a venda",
            ["R-PC-03", "R-PC-01", "R-PC-02", "R-VEN-02"],
            [
              debito(papeis.cofinsSobreFaturamento, cofins),
              credito(papeis.cofinsARecolher, cofins),
            ],
          ),
          // R-VEN-02
          rascunho(
            "Custo das mercadorias vendidas",
            ["R-VEN-02", "R-EST-03", "R-COM-04"],
            [debito(papeis.cmv, saida.cmvCentavos), credito(papeis.estoque, saida.cmvCentavos)],
          ),
        ],
      };
    }

    case "recebimento": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor recebido");
      if (operacao.valorCentavos > saldoDevedor(movimentos, papeis.clientes)) {
        throw new ErroDeOperacao(
          "excede_saldo",
          "O recebimento não pode ser maior que o saldo de Clientes.",
          "R-VEN-03",
        );
      }
      return {
        ...semMudanca,
        rascunhos: [
          // R-VEN-03
          rascunho(
            "Recebimento de cliente",
            ["R-VEN-03"],
            [
              debito(contaDoMeio(operacao.meio), operacao.valorCentavos),
              credito(papeis.clientes, operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "pagamento": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor pago");
      // R-PC-04: o pagamento de PIS/COFINS fica fora da v1.
      const obrigacoes = {
        fornecedores: {
          conta: papeis.fornecedores,
          historico: "Pagamento a fornecedor",
          regras: ["R-DES-05", "R-DES-01"],
        },
        salarios: {
          conta: papeis.salariosAPagar,
          historico: "Pagamento de salários",
          regras: ["R-DES-02", "R-DES-01"],
        },
        icms: {
          conta: papeis.icmsARecolher,
          historico: "Pagamento do ICMS no Posto Fiscal",
          regras: ["R-ICMS-06"],
        },
      } as const satisfies Record<
        string,
        { conta: CodigoConta; historico: string; regras: IdRegra[] }
      >;
      const obrigacao: (typeof obrigacoes)[keyof typeof obrigacoes] | undefined =
        obrigacoes[operacao.obrigacao];
      if (!obrigacao) {
        throw new ErroDeOperacao(
          "caso_nao_coberto",
          "Só é possível pagar fornecedores, salários e ICMS nesta versão.",
          "R-PC-04",
        );
      }
      if (operacao.valorCentavos > saldoCredor(movimentos, obrigacao.conta)) {
        throw new ErroDeOperacao(
          "excede_saldo",
          "O pagamento não pode ser maior que o saldo da obrigação.",
          obrigacao.regras[0],
        );
      }
      return {
        ...semMudanca,
        rascunhos: [
          // R-DES-05 (fornecedor), R-DES-02 (salários), R-ICMS-06 (ICMS)
          rascunho(obrigacao.historico, obrigacao.regras, [
            debito(obrigacao.conta, operacao.valorCentavos),
            credito(contaDoMeio(operacao.meio), operacao.valorCentavos),
          ]),
        ],
      };
    }

    case "provisao_salarios": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor dos salários");
      return {
        ...semMudanca,
        rascunhos: [
          // R-DES-02; R-DES-01/R-GER-03: a despesa é do mês, mesmo paga depois.
          // R-DES-03 📘: sem encargos nem retenções.
          rascunho(
            "Salários do mês",
            ["R-DES-02", "R-DES-01", "R-GER-03", "R-DES-03"],
            [
              debito(papeis.despesaSalarios, operacao.valorCentavos),
              credito(papeis.salariosAPagar, operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "despesa": {
      exigirInteiroPositivo(operacao.valorCentavos, "Valor da despesa");
      if (operacao.natureza !== "energia_eletrica") {
        throw new ErroDeOperacao(
          "caso_nao_coberto",
          "Só a despesa com energia elétrica está prevista nesta versão.",
          "R-DES-04",
        );
      }
      return {
        ...semMudanca,
        rascunhos: [
          // R-DES-04
          rascunho(
            "Energia elétrica paga no ato",
            ["R-DES-04", "R-DES-01"],
            [
              debito(papeis.despesaEnergia, operacao.valorCentavos),
              credito(contaDoMeio(operacao.meio), operacao.valorCentavos),
            ],
          ),
        ],
      };
    }

    case "depreciacao": {
      if (!mesmoMes(operacao.mes, data)) {
        throw new ErroDeOperacao(
          "valor_invalido",
          "A depreciação deve ser lançada dentro do próprio mês.",
          "R-DEP-04",
        );
      }
      const jaLancada = estado.lancamentos.some(
        (l) => l.operacao === "depreciacao" && mesmoMes(l.data, operacao.mes),
      );
      if (jaLancada) {
        throw new ErroDeOperacao(
          "operacao_repetida",
          "A depreciação deste mês já foi lançada.",
          "R-DEP-04",
        );
      }
      const rascunhos: Rascunho[] = [];
      for (const classe of CLASSES_DEPRECIAVEIS) {
        // R-DEP-03: mês completo a partir do mês em que o bem entra em uso.
        const custo = estado.imobilizado
          .filter(
            (bem) => bem.classe === classe && compararMeses(bem.emUsoDesde, operacao.mes) <= 0,
          )
          .reduce((soma, bem) => soma + bem.custoCentavos, 0);
        if (custo === 0) continue;
        const contaAcumulada = papeis.depreciacaoAcumulada[classe];
        // R-DEP-01, R-DEP-04: linear, round(custo ÷ vidaUtilAnos ÷ 12), por classe.
        const quota = multiplicarEDividir(custo, 1, parametros.vidaUtilAnos[classe] * 12);
        // R-DEP-02 📘: valor residual zero. A depreciação para quando o custo se esgota.
        const aDepreciar = custo - saldoCredor(movimentos, contaAcumulada);
        const valor = Math.min(quota, Math.max(aDepreciar, 0));
        if (valor === 0) continue;
        rascunhos.push(
          rascunho(
            "Depreciação do mês",
            ["R-DEP-04", "R-DEP-01", "R-DEP-02", "R-DEP-03"],
            [debito(papeis.despesaDepreciacao, valor), credito(contaAcumulada, valor)],
          ),
        );
      }
      return { ...semMudanca, rascunhos };
    }

    case "apuracao_icms": {
      if (!mesmoMes(operacao.mes, data)) {
        throw new ErroDeOperacao(
          "valor_invalido",
          "A apuração do ICMS deve ser feita dentro do próprio mês.",
          "R-ICMS-06",
        );
      }
      // R-ICMS-06: compensa min(a recolher, a recuperar). O saldo devedor é pago no
      // Posto Fiscal; o saldo credor permanece em ICMS a Recuperar.
      const compensar = Math.min(
        Math.max(saldoCredor(movimentos, papeis.icmsARecolher), 0),
        Math.max(saldoDevedor(movimentos, papeis.icmsARecuperar), 0),
      );
      return {
        ...semMudanca,
        rascunhos:
          compensar === 0
            ? []
            : [
                rascunho(
                  "Apuração do ICMS do mês",
                  ["R-ICMS-06"],
                  [
                    debito(papeis.icmsARecolher, compensar),
                    credito(papeis.icmsARecuperar, compensar),
                  ],
                ),
              ],
      };
    }

    case "encerramento": {
      // R-DEM-04: zera as contas de resultado contra Lucros ou Prejuízos Acumulados.
      const partidas: Partida[] = [];
      let resultado = 0;
      for (const c of estado.planoDeContas.contas) {
        if (!ehContaDeResultado(c)) continue;
        const devedor = saldoDevedor(movimentos, c.codigo);
        if (devedor === 0) continue;
        partidas.push(devedor > 0 ? credito(c.codigo, devedor) : debito(c.codigo, -devedor));
        resultado -= devedor;
      }
      if (resultado > 0) partidas.push(credito(papeis.lucrosOuPrejuizosAcumulados, resultado));
      if (resultado < 0) partidas.push(debito(papeis.lucrosOuPrejuizosAcumulados, -resultado));
      return {
        ...semMudanca,
        rascunhos:
          partidas.length === 0
            ? []
            : [rascunho("Encerramento das contas de resultado", ["R-DEM-04"], partidas)],
      };
    }
  }
}

function somar(partidas: readonly Partida[], lado: "D" | "C"): Centavos {
  return partidas.reduce((soma, p) => (p.lado === lado ? soma + p.valorCentavos : soma), 0);
}

/**
 * Calcula os lançamentos esperados de uma operação e o novo estado, **sem gravar**.
 * Lança `ErroDeOperacao` quando a operação é bloqueada.
 */
export function preverLancamentos(
  estado: EstadoContabil,
  operacao: Operacao,
  data: DataJogo,
): Previsao {
  exigirDataValida(data);
  const ultimo = estado.lancamentos.at(-1);
  if (ultimo && compararDatas(data, ultimo.data) < 0) {
    throw new ErroDeOperacao(
      "valor_invalido",
      "A data da operação não pode ser anterior ao último lançamento do razão.",
    );
  }

  const calculo = calcular(estado, operacao, data);
  const lancamentos: Lancamento[] = calculo.rascunhos
    .filter((r) => r.partidas.length > 0)
    .map((r, indice) => ({
      id: estado.lancamentos.length + indice + 1,
      data,
      operacao: operacao.tipo,
      historico: r.historico,
      regras: r.regras,
      partidas: r.partidas,
    }));

  for (const lancamento of lancamentos) {
    // R-GER-01: partidas dobradas em todo lançamento.
    if (somar(lancamento.partidas, "D") !== somar(lancamento.partidas, "C")) {
      throw new Error(`Lançamento desequilibrado gerado pelo motor: ${lancamento.historico}`);
    }
  }

  const novoEstado: EstadoContabil = {
    ...estado,
    lancamentos: [...estado.lancamentos, ...lancamentos],
    estoque: calculo.estoque,
    imobilizado: calculo.imobilizado,
  };

  const { papeis } = estado.planoDeContas;
  const movimentos = acumularMovimentos(novoEstado.lancamentos);
  for (const [conta, nome] of [
    [papeis.caixa, "Caixa"],
    [papeis.bancos, "Bancos"],
  ] as const) {
    if (saldoDevedor(movimentos, conta) < 0) {
      throw new ErroDeOperacao("saldo_insuficiente", `Saldo insuficiente em ${nome}.`);
    }
  }

  return { lancamentos, novoEstado, valores: calculo.valores };
}

/** Grava no razão os lançamentos **do motor** para a operação (ADR-0005). */
export function aplicar(
  estado: EstadoContabil,
  operacao: Operacao,
  data: DataJogo,
): EstadoContabil {
  return preverLancamentos(estado, operacao, data).novoEstado;
}

/** Operação de depreciação do mês (R-DEP-04). Os valores são calculados ao aplicar. */
export function depreciarMes(_estado: EstadoContabil, mes: { ano: number; mes: number }): Operacao {
  return { tipo: "depreciacao", mes: { ano: mes.ano, mes: mes.mes } };
}

/** Operação de apuração do ICMS do mês (R-ICMS-06). Os valores são calculados ao aplicar. */
export function apurarIcms(_estado: EstadoContabil, mes: { ano: number; mes: number }): Operacao {
  return { tipo: "apuracao_icms", mes: { ano: mes.ano, mes: mes.mes } };
}
