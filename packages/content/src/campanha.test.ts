import {
  aplicar,
  balancete,
  balanco,
  CATALOGO_DA_HAMBURGUERIA,
  criarEmpresa,
  type DataJogo,
  dre,
  type EstadoContabil,
} from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import {
  ACIONISTA_AVATAR,
  carregarConteudoDoJogo,
  type OperacaoDeMissao,
  paraOperacaoDoMotor,
  parteDoAcionista,
} from "./index";

/**
 * As missões declaram só as operações. Jogadas em ordem pelo motor, elas têm de
 * chegar aos números de docs/cenario-campanha.md (a campanha da hamburgueria).
 */
describe("campanha da hamburgueria jogada pelo motor", () => {
  const { missoes } = carregarConteudoDoJogo();
  const mes = { ano: 1, mes: 1 };
  const dia = (d: number): DataJogo => ({ ...mes, dia: d });

  let estado: EstadoContabil = criarEmpresa({ catalogo: CATALOGO_DA_HAMBURGUERIA });
  let carteiraDoAvatar = 10_000_000; // R$ 100.000,00, fora do razão (ADR-0004)
  let participacaoDoAvatar = 0;

  // As conversas com a contadora não têm operação e não ocupam um dia.
  missoes
    .filter((missao) => missao.operacoes.length > 0)
    .forEach((missao, indice) => {
      // As missões de fechamento são do último dia do mês.
      const fechamento = missao.operacoes.some(
        (o) => o.tipo === "depreciacao" || o.tipo === "apuracao_icms",
      );
      for (const operacao of missao.operacoes) {
        if (operacao.tipo === "subscricao") {
          participacaoDoAvatar = operacao.participacoes[ACIONISTA_AVATAR] ?? 0;
        }
        if (operacao.tipo === "integralizacao") {
          carteiraDoAvatar -= parteDoAcionista(operacao.valorCentavos, participacaoDoAvatar);
        }
        estado = aplicar(
          estado,
          paraOperacaoDoMotor(operacao, { mes }),
          // Várias operações por dia: a campanha inteira cabe no mês.
          dia(fechamento ? 30 : Math.floor(indice / 2) + 1),
        );
      }
    });

  const fimDoMes = dia(30);

  it("todas as operações das missões são aceitas pelo motor, na ordem da campanha", () => {
    expect(missoes.filter((m) => m.operacoes.length > 0)).toHaveLength(34);
    // As conversas com a Marta não têm operação.
    expect(missoes.filter((m) => m.operacoes.length === 0).map((m) => m.id)).toEqual([
      "m000-apresentacao",
      "m000-para-que-serve",
      "m000-como-registrar",
      "m011-conversa-tributos",
    ]);
    expect(missoes.reduce((soma, m) => soma + m.operacoes.length, 0)).toBe(36);
    expect(estado.lancamentos.length).toBeGreaterThan(40);
  });

  it("a DRE do mês bate com o cenário da campanha", () => {
    const d = dre(estado, { de: dia(1), ate: fimDoMes });
    expect(d.totalReceitaBrutaCentavos).toBe(2_490_000);
    expect(d.receitaLiquidaCentavos).toBe(2_160_116);
    expect(d.lucroBrutoCentavos).toBe(1_321_522);
    expect(d.resultadoFinanceiroCentavos).toBe(-2_264);
    expect(d.resultadoCentavos).toBe(889_425);
  });

  it("o Balanço Patrimonial bate com o cenário da campanha", () => {
    const bp = balanco(estado, fimDoMes);
    expect(bp.ativo.totalCirculanteCentavos).toBe(3_844_842);
    expect(bp.ativo.totalNaoCirculanteCentavos).toBe(7_761_667);
    expect(bp.ativo.totalCentavos).toBe(11_606_509);
    expect(bp.passivo.totalCirculanteCentavos).toBe(717_084);
    expect(bp.patrimonioLiquido.totalCentavos).toBe(10_889_425);
    expect(bp.totalPassivoEPatrimonioLiquidoCentavos).toBe(11_606_509);
  });

  it("o balancete fecha em 132.510,17", () => {
    const b = balancete(estado);
    expect(b.totalDevedorCentavos).toBe(13_251_017);
    expect(b.totalCredorCentavos).toBe(13_251_017);
  });

  it("os capítulos 2 e 3 não têm tributos; do 4 em diante, toda compra e venda tem", () => {
    for (const missao of missoes) {
      for (const operacao of missao.operacoes) {
        if (operacao.tipo !== "compra" && operacao.tipo !== "venda") continue;
        const semTributos = operacao.semTributos === true;
        expect(semTributos, missao.id).toBe((missao.capitulo ?? 0) <= 3);
      }
    }
  });

  it("a carteira pessoal do avatar termina com R$ 10.000,00, fora do razão", () => {
    expect(participacaoDoAvatar).toBe(9000);
    expect(carteiraDoAvatar).toBe(1_000_000);
  });

  it("a consignação termina zerada: o que sobrou voltou para a marca", () => {
    expect(estado.consignado.refrigerante?.quantidade).toBe(0);
  });
});

describe("paraOperacaoDoMotor", () => {
  const mes = { ano: 2, mes: 5 };

  it("usa o meio escolhido pelo jogador quando a missão deixa a escolha com ele", () => {
    const compra: OperacaoDeMissao = {
      tipo: "compra",
      itens: [{ produto: "refrigerante", quantidade: 1, precoUnitarioCentavos: 500 }],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "escolha_do_jogador" },
    };
    expect(paraOperacaoDoMotor(compra, { mes, meioEscolhido: "caixa" })).toMatchObject({
      condicao: { tipo: "avista", meio: "caixa" },
    });
    expect(() => paraOperacaoDoMotor(compra, { mes })).toThrow(/meio escolhido/);
  });

  it("campos opcionais ausentes na missão não vão ao motor", () => {
    const venda = paraOperacaoDoMotor(
      {
        tipo: "venda",
        itens: [{ produto: "refrigerante", quantidade: 1, precoUnitarioCentavos: 600 }],
        condicao: { tipo: "avista" },
      },
      { mes },
    );
    expect(Object.keys(venda).sort()).toEqual(["condicao", "itens", "tipo"]);
    // R-DID-01: a marca de "sem tributos" chega ao motor.
    expect(
      paraOperacaoDoMotor(
        {
          tipo: "venda",
          itens: [{ produto: "refrigerante", quantidade: 1, precoUnitarioCentavos: 600 }],
          condicao: { tipo: "avista" },
          semTributos: true,
        },
        { mes },
      ),
    ).toMatchObject({ semTributos: true });
    expect(
      paraOperacaoDoMotor(
        {
          tipo: "pagamento",
          obrigacao: "fornecedores",
          valorCentavos: 100,
          meio: "bancos",
          descontoFinanceiroCentavos: 2,
        },
        { mes },
      ),
    ).toMatchObject({ descontoFinanceiroCentavos: 2 });
    expect(paraOperacaoDoMotor({ tipo: "apuracao_ipi" }, { mes })).toEqual({
      tipo: "apuracao_ipi",
      mes,
    });
  });

  it("depreciação e apuração do ICMS usam o mês corrente do jogo", () => {
    expect(paraOperacaoDoMotor({ tipo: "depreciacao" }, { mes })).toEqual({
      tipo: "depreciacao",
      mes,
    });
    expect(paraOperacaoDoMotor({ tipo: "apuracao_icms" }, { mes })).toEqual({
      tipo: "apuracao_icms",
      mes,
    });
  });

  it("a subscrição vai ao motor sem as participações (R-CAP-05)", () => {
    expect(
      paraOperacaoDoMotor(
        { tipo: "subscricao", valorCentavos: 100, participacoes: { avatar: 9000, osvaldo: 1000 } },
        { mes },
      ),
    ).toEqual({ tipo: "subscricao", valorCentavos: 100 });
  });

  it("parteDoAcionista não aceita divisão com sobra de centavo", () => {
    expect(parteDoAcionista(30_000_000, 9000)).toBe(27_000_000);
    expect(() => parteDoAcionista(1, 9000)).toThrow();
  });
});
