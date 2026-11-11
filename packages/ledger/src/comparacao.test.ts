import { describe, expect, it } from "vitest";
import {
  balanco,
  compararLancamento,
  criarEmpresa,
  dre,
  type EstadoContabil,
  type Partida,
  preverLancamentos,
  simularLancamentoInformado,
} from "./index";
import {
  compraDeMercadorias,
  dia,
  executarTodas,
  r,
  reais,
  vendaDeMercadorias,
} from "./testes/apoio";

const CONTAS = {
  caixa: "1.1.1",
  bancos: "1.1.2",
  estoque: "1.1.4",
  icmsARecuperar: "1.1.5",
  edificacoes: "1.2.3.2",
  fornecedores: "2.1.1",
  capital: "2.3.1",
  capitalAIntegralizar: "2.3.2",
  receita: "3.1.1",
  cmv: "4.1.1",
  salarios: "4.2.1",
  depreciacao: "4.2.3",
} as const;

const D = (conta: string, valor: string): Partida => ({
  conta,
  lado: "D",
  valorCentavos: r(valor),
});
const C = (conta: string, valor: string): Partida => ({
  conta,
  lado: "C",
  valorCentavos: r(valor),
});

const empresa = (): EstadoContabil =>
  executarTodas(criarEmpresa(), [
    [{ tipo: "subscricao", valorCentavos: r("100.000,00") }, dia(1)],
    [{ tipo: "integralizacao", valorCentavos: r("100.000,00"), meio: "bancos" }, dia(1)],
  ]);

const compraAPrazo = compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 });

describe("compararLancamento (ADR-0005)", () => {
  const esperado = preverLancamentos(empresa(), compraAPrazo, dia(2)).lancamentos;

  it("lançamento igual ao esperado está correto", () => {
    const resultado = compararLancamento(esperado, [
      D(CONTAS.estoque, "2.460,00"),
      D(CONTAS.icmsARecuperar, "540,00"),
      C(CONTAS.fornecedores, "3.000,00"),
    ]);
    expect(resultado.correto).toBe(true);
    expect(resultado.equilibrado).toBe(true);
    expect(resultado.faltantes).toEqual([]);
    expect(resultado.linhas.map((l) => l.situacao)).toEqual(["correta", "correta", "correta"]);
  });

  it("a ordem das linhas não importa", () => {
    const resultado = compararLancamento(esperado, [
      C(CONTAS.fornecedores, "3.000,00"),
      D(CONTAS.icmsARecuperar, "540,00"),
      D(CONTAS.estoque, "2.460,00"),
    ]);
    expect(resultado.correto).toBe(true);
  });

  it("estoque pelo valor da nota: valor incorreto no Estoque e ICMS a Recuperar faltando", () => {
    const resultado = compararLancamento(esperado, [
      D(CONTAS.estoque, "3.000,00"),
      C(CONTAS.fornecedores, "3.000,00"),
    ]);
    expect(resultado.correto).toBe(false);
    expect(resultado.equilibrado).toBe(true);
    expect(resultado.linhas.map((l) => l.situacao)).toEqual(["valor_incorreto", "correta"]);
    expect(resultado.linhas[0]?.esperado).toEqual(D(CONTAS.estoque, "2.460,00"));
    expect(resultado.linhas[0]?.regras).toContain("R-COM-01");
    expect(resultado.faltantes.map((f) => f.esperado)).toEqual([
      D(CONTAS.icmsARecuperar, "540,00"),
    ]);
    expect(resultado.faltantes[0]?.regras).toContain("R-ICMS-04");
  });

  it("conta certa no lado errado", () => {
    const resultado = compararLancamento(esperado, [
      D(CONTAS.estoque, "2.460,00"),
      D(CONTAS.icmsARecuperar, "540,00"),
      D(CONTAS.fornecedores, "3.000,00"),
    ]);
    expect(resultado.correto).toBe(false);
    expect(resultado.equilibrado).toBe(false);
    expect(resultado.linhas[2]?.situacao).toBe("lado_incorreto");
    expect(resultado.linhas[2]?.esperado).toEqual(C(CONTAS.fornecedores, "3.000,00"));
  });

  it("conta que não faz parte do lançamento", () => {
    const resultado = compararLancamento(esperado, [
      D(CONTAS.estoque, "2.460,00"),
      D(CONTAS.icmsARecuperar, "540,00"),
      C(CONTAS.bancos, "3.000,00"),
    ]);
    expect(resultado.correto).toBe(false);
    expect(resultado.linhas[2]).toMatchObject({ situacao: "conta_inesperada", esperado: null });
    expect(resultado.faltantes.map((f) => f.esperado)).toEqual([
      C(CONTAS.fornecedores, "3.000,00"),
    ]);
  });

  it("dividir ou juntar linhas da mesma conta não é erro", () => {
    const depreciacao = preverLancamentos(
      executarTodas(empresa(), [
        [
          {
            tipo: "compra_imobilizado",
            itens: [
              { classe: "edificacoes", valorCentavos: r("30.000,00") },
              { classe: "equipamentos", valorCentavos: r("6.000,00") },
            ],
            meio: "bancos",
          },
          dia(2),
        ],
      ]),
      { tipo: "depreciacao", mes: { ano: 1, mes: 1 } },
      dia(30),
    ).lancamentos;
    // O motor gera duas linhas de Despesa de Depreciação (100,00 cada); o jogador junta.
    const junto = compararLancamento(depreciacao, [
      D(CONTAS.depreciacao, "200,00"),
      C("1.2.3.8", "100,00"),
      C("1.2.3.10", "100,00"),
    ]);
    expect(junto.correto).toBe(true);

    const dividido = compararLancamento(esperado, [
      D(CONTAS.estoque, "2.000,00"),
      D(CONTAS.estoque, "460,00"),
      D(CONTAS.icmsARecuperar, "540,00"),
      C(CONTAS.fornecedores, "3.000,00"),
    ]);
    expect(dividido.correto).toBe(true);
  });

  it("capital autorizado (R-CAP-02): o esperado é nenhum lançamento", () => {
    expect(compararLancamento([], []).correto).toBe(true);
    const resultado = compararLancamento(
      [],
      [D(CONTAS.capitalAIntegralizar, "500.000,00"), C(CONTAS.capital, "500.000,00")],
    );
    expect(resultado.correto).toBe(false);
    expect(resultado.linhas.map((l) => l.situacao)).toEqual([
      "conta_inesperada",
      "conta_inesperada",
    ]);
  });
});

describe("simularLancamentoInformado — prévia do erro (ADR-0005)", () => {
  const periodo = { de: dia(1), ate: dia(31) };

  it("lançamento desequilibrado não gera prévia", () => {
    const previa = simularLancamentoInformado(
      empresa(),
      [D(CONTAS.estoque, "3.000,00"), C(CONTAS.fornecedores, "2.000,00")],
      dia(2),
    );
    expect(previa).toEqual({
      equilibrado: false,
      totalDebitosCentavos: r("3.000,00"),
      totalCreditosCentavos: r("2.000,00"),
    });
  });

  it("a prévia nunca toca o razão", () => {
    const estado = empresa();
    const antes = JSON.stringify(estado);
    simularLancamentoInformado(
      estado,
      [D(CONTAS.estoque, "3.000,00"), C(CONTAS.fornecedores, "3.000,00")],
      dia(2),
    );
    expect(JSON.stringify(estado)).toBe(antes);
  });

  it("capítulo 1 — lançar o capital autorizado: PL inflado sem dinheiro entrando", () => {
    const estado = empresa();
    const previa = simularLancamentoInformado(
      estado,
      [D(CONTAS.bancos, "500.000,00"), C(CONTAS.capital, "500.000,00")],
      dia(1),
    );
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    const correto = balanco(estado, dia(1));
    expect(
      previa.balanco.patrimonioLiquido.totalCentavos - correto.patrimonioLiquido.totalCentavos,
    ).toBe(r("500.000,00"));
    expect(previa.balanco.ativo.totalCentavos).toBe(
      previa.balanco.totalPassivoEPatrimonioLiquidoCentavos,
    );
  });

  it("capítulo 2 — imóvel de uso como Estoque: Ativo Circulante inflado", () => {
    const estado = empresa();
    const previa = simularLancamentoInformado(
      estado,
      [D(CONTAS.estoque, "60.000,00"), C(CONTAS.bancos, "60.000,00")],
      dia(2),
    );
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    const correto = balanco(
      preverLancamentos(
        estado,
        {
          tipo: "compra_imobilizado",
          itens: [{ classe: "edificacoes", valorCentavos: r("60.000,00") }],
          meio: "bancos",
        },
        dia(2),
      ).novoEstado,
      dia(2),
    );
    expect(
      previa.balanco.ativo.totalCirculanteCentavos - correto.ativo.totalCirculanteCentavos,
    ).toBe(r("60.000,00"));
    expect(previa.balanco.ativo.totalNaoCirculanteCentavos).toBe(0);
    expect(previa.balanco.ativo.totalCentavos).toBe(correto.ativo.totalCentavos);
  });

  it("capítulo 4 — estoque pelo valor da nota: estoque superavaliado, ICMS a Recuperar zerado", () => {
    const previa = simularLancamentoInformado(
      empresa(),
      [D(CONTAS.estoque, "3.000,00"), C(CONTAS.fornecedores, "3.000,00")],
      dia(2),
    );
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    const ativo = Object.fromEntries(
      previa.balanco.ativo.circulante.map((l) => [l.nome, reais(l.valorCentavos)]),
    );
    expect(ativo["Estoque de Mercadorias"]).toBe("3.000,00"); // o correto é 2.460,00
    expect(ativo["ICMS a Recuperar"]).toBe("0,00"); // o correto é 540,00
  });

  it("capítulo 4 — compra como despesa: prejuízo falso no mês", () => {
    const estado = empresa();
    const previa = simularLancamentoInformado(
      estado,
      [D(CONTAS.cmv, "3.000,00"), C(CONTAS.fornecedores, "3.000,00")],
      dia(2),
      periodo,
    );
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    const correto = preverLancamentos(estado, compraAPrazo, dia(2)).novoEstado;
    expect(dre(correto, periodo).resultadoCentavos).toBe(0);
    expect(reais(previa.dre.resultadoCentavos)).toBe("-3.000,00");
    expect(reais(previa.balanco.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("-3.000,00");
  });

  it("capítulo 5 — venda sem CMV: lucro superavaliado e estoque que não diminui", () => {
    const estado = executarTodas(empresa(), [[compraAPrazo, dia(2)]]);
    const venda = vendaDeMercadorias(10, "50,00", { tipo: "avista" });
    const esperado = preverLancamentos(estado, venda, dia(3));
    const semCmv = esperado.lancamentos
      .flatMap((l) => l.partidas)
      .filter((p) => p.conta !== CONTAS.cmv && p.conta !== CONTAS.estoque);
    const previa = simularLancamentoInformado(estado, semCmv, dia(3), periodo);
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    const correto = dre(esperado.novoEstado, periodo);
    expect(previa.dre.resultadoCentavos - correto.resultadoCentavos).toBe(r("246,00"));
    const estoqueNaPrevia = previa.balanco.ativo.circulante.find((l) => l.conta === CONTAS.estoque);
    expect(reais(estoqueNaPrevia?.valorCentavos ?? 0)).toBe("2.460,00");
  });

  it("capítulo 6 — salário só no pagamento: nenhuma despesa no mês da competência", () => {
    const estado = empresa();
    const correto = preverLancamentos(
      estado,
      { tipo: "provisao_salarios", valorCentavos: r("4.000,00") },
      dia(28),
    ).novoEstado;
    expect(reais(dre(correto, periodo).totalDespesasOperacionaisCentavos)).toBe("4.000,00");
    // O jogador não lança nada em janeiro e só reconhece a despesa ao pagar, em fevereiro.
    expect(dre(estado, periodo).totalDespesasOperacionaisCentavos).toBe(0);
    const previa = simularLancamentoInformado(
      estado,
      [D(CONTAS.salarios, "4.000,00"), C(CONTAS.bancos, "4.000,00")],
      dia(5, 2),
    );
    if (!previa.equilibrado) throw new Error("deveria gerar prévia");
    expect(reais(previa.dre.totalDespesasOperacionaisCentavos)).toBe("4.000,00"); // em fevereiro
  });

  it("recusa conta inexistente e valor inválido", () => {
    expect(() =>
      simularLancamentoInformado(empresa(), [D("9.9.9", "1,00"), C(CONTAS.caixa, "1,00")], dia(2)),
    ).toThrow(/Conta inexistente/);
    expect(() =>
      simularLancamentoInformado(
        empresa(),
        [
          { conta: CONTAS.caixa, lado: "D", valorCentavos: 0.5 },
          { conta: CONTAS.bancos, lado: "C", valorCentavos: 0.5 },
        ],
        dia(2),
      ),
    ).toThrow();
  });
});
