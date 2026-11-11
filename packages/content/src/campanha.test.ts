import {
  aplicar,
  balancete,
  balanco,
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
 * chegar aos números de docs/cenario-campanha.md.
 */
describe("campanha dos capítulos 1 a 7 jogada pelo motor", () => {
  const { missoes } = carregarConteudoDoJogo();
  const mes = { ano: 1, mes: 1 };
  const dia = (d: number): DataJogo => ({ ...mes, dia: d });

  let estado: EstadoContabil = criarEmpresa();
  let carteiraDoAvatar = 28_000_000; // R$ 280.000,00, fora do razão (ADR-0004)
  let participacaoDoAvatar = 0;

  missoes.forEach((missao, indice) => {
    for (const operacao of missao.operacoes) {
      if (operacao.tipo === "subscricao") {
        participacaoDoAvatar = operacao.participacoes[ACIONISTA_AVATAR] ?? 0;
      }
      if (operacao.tipo === "integralizacao") {
        carteiraDoAvatar -= parteDoAcionista(operacao.valorCentavos, participacaoDoAvatar);
      }
      estado = aplicar(estado, paraOperacaoDoMotor(operacao, { mes }), dia(indice + 1));
    }
  });

  const fimDoMes = dia(30);

  it("todas as operações das missões são aceitas pelo motor, na ordem da campanha", () => {
    expect(missoes).toHaveLength(16);
    expect(estado.lancamentos.length).toBeGreaterThan(20);
  });

  it("a DRE do mês bate com o cenário da campanha", () => {
    const d = dre(estado, { de: dia(1), ate: fimDoMes });
    expect(d.totalReceitaBrutaCentavos).toBe(350_000);
    expect(d.receitaLiquidaCentavos).toBe(276_524);
    expect(d.lucroBrutoCentavos).toBe(133_024);
    expect(d.resultadoCentavos).toBe(-427_809);
  });

  it("o Balanço Patrimonial bate com o cenário da campanha", () => {
    const bp = balanco(estado, fimDoMes);
    expect(bp.ativo.totalCirculanteCentavos).toBe(10_643_500);
    expect(bp.ativo.totalNaoCirculanteCentavos).toBe(19_939_167);
    expect(bp.ativo.totalCentavos).toBe(30_582_667);
    expect(bp.passivo.totalCirculanteCentavos).toBe(1_010_476);
    expect(bp.patrimonioLiquido.totalCentavos).toBe(29_572_191);
    expect(bp.totalPassivoEPatrimonioLiquidoCentavos).toBe(30_582_667);
  });

  it("o balancete fecha em 314.213,09", () => {
    const b = balancete(estado);
    expect(b.totalDevedorCentavos).toBe(31_421_309);
    expect(b.totalCredorCentavos).toBe(31_421_309);
  });

  it("a carteira pessoal do avatar termina com R$ 10.000,00, fora do razão", () => {
    expect(participacaoDoAvatar).toBe(9000);
    expect(carteiraDoAvatar).toBe(1_000_000);
  });
});

describe("paraOperacaoDoMotor", () => {
  const mes = { ano: 2, mes: 5 };

  it("usa o meio escolhido pelo jogador quando a missão deixa a escolha com ele", () => {
    const compra: OperacaoDeMissao = {
      tipo: "compra",
      itens: [{ produto: "mercadorias-diversas", quantidade: 1, precoUnitarioCentavos: 500 }],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "escolha_do_jogador" },
    };
    expect(paraOperacaoDoMotor(compra, { mes, meioEscolhido: "caixa" })).toMatchObject({
      condicao: { tipo: "avista", meio: "caixa" },
    });
    expect(() => paraOperacaoDoMotor(compra, { mes })).toThrow(/meio escolhido/);
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
