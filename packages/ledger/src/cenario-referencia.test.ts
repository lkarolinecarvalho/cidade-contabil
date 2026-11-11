import { describe, expect, it } from "vitest";
import { apurarIcms, balancete, balanco, criarEmpresa, dre, type EstadoContabil } from "./index";
import {
  compraDeMercadorias,
  dia,
  executar,
  r,
  reais,
  saldoDe,
  vendaDeMercadorias,
} from "./testes/apoio";

/**
 * Teste dourado de tributos e custo médio: docs/cenario-referencia.md, centavo por
 * centavo. Os passos rodam em sequência sobre o mesmo estado.
 */
describe("cenário de referência (teste dourado)", () => {
  let estado: EstadoContabil = criarEmpresa();
  const arroz = "arroz-5kg";

  const passo = (...args: Parameters<typeof executar>) => {
    const resultado = executar(...args);
    estado = resultado.estado;
    return resultado.linhas;
  };

  it("Op 1 — subscrição e integralização no mesmo ato", () => {
    passo(estado, { tipo: "subscricao", valorCentavos: r("10.000,00") }, dia(1));
    passo(estado, { tipo: "integralizacao", valorCentavos: r("10.000,00"), meio: "caixa" }, dia(1));
    // Os lançamentos em (−) Capital a Integralizar se anulam; o efeito líquido é
    // D Caixa / C Capital Social Subscrito.
    expect(saldoDe(estado, "Caixa")).toBe("10.000,00 D");
    expect(saldoDe(estado, "Capital Social Subscrito")).toBe("10.000,00 C");
    expect(saldoDe(estado, "(−) Capital a Integralizar")).toBe("0,00");
  });

  it("Op 2 — depósito no banco", () => {
    expect(passo(estado, { tipo: "deposito", valorCentavos: r("6.000,00") }, dia(2))).toEqual([
      ["Bancos Conta Movimento", "D", "6.000,00"],
      ["Caixa", "C", "6.000,00"],
    ]);
  });

  it("Op 3 — compra a prazo, 30 dias: 100 un × R$ 30,00", () => {
    expect(
      passo(
        estado,
        compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }, { produto: arroz }),
        dia(3),
      ),
    ).toEqual([
      ["Estoque de Mercadorias", "D", "2.460,00"],
      ["ICMS a Recuperar", "D", "540,00"],
      ["Fornecedores", "C", "3.000,00"],
    ]);
    expect(estado.estoque[arroz]).toEqual({ quantidade: 100, valorCentavos: r("2.460,00") });
  });

  it("Op 4 — compra à vista via banco, com IPI de 10% e frete de R$ 50,00", () => {
    expect(
      passo(
        estado,
        compraDeMercadorias(
          50,
          "30,00",
          { tipo: "avista", meio: "bancos" },
          { produto: arroz, ipiAliquota: 1000, frete: "50,00" },
        ),
        dia(4),
      ),
    ).toEqual([
      ["Estoque de Mercadorias", "D", "1.421,00"],
      ["ICMS a Recuperar", "D", "279,00"],
      ["Bancos Conta Movimento", "C", "1.700,00"],
    ]);
    expect(estado.estoque[arroz]).toEqual({ quantidade: 150, valorCentavos: r("3.881,00") });
  });

  it("Op 5 — venda à vista: 80 un × R$ 50,00 (CMV 2.069,87)", () => {
    expect(
      passo(estado, vendaDeMercadorias(80, "50,00", { tipo: "avista" }, arroz), dia(10)),
    ).toEqual([
      ["Caixa", "D", "4.000,00"],
      ["Receita Bruta de Vendas", "C", "4.000,00"],
      ["ICMS sobre Vendas", "D", "720,00"],
      ["ICMS a Recolher", "C", "720,00"],
      ["PIS sobre Faturamento", "D", "21,32"],
      ["PIS a Recolher", "C", "21,32"],
      ["COFINS sobre Faturamento", "D", "98,40"],
      ["COFINS a Recolher", "C", "98,40"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "2.069,87"],
      ["Estoque de Mercadorias", "C", "2.069,87"],
    ]);
    expect(estado.estoque[arroz]).toEqual({ quantidade: 70, valorCentavos: r("1.811,13") });
  });

  it("Op 6 — venda a prazo: 30 un × R$ 50,00 (PIS 7,995 → 8,00; CMV 776,20)", () => {
    expect(
      passo(estado, vendaDeMercadorias(30, "50,00", { tipo: "prazo", dias: 30 }, arroz), dia(12)),
    ).toEqual([
      ["Clientes", "D", "1.500,00"],
      ["Receita Bruta de Vendas", "C", "1.500,00"],
      ["ICMS sobre Vendas", "D", "270,00"],
      ["ICMS a Recolher", "C", "270,00"],
      ["PIS sobre Faturamento", "D", "8,00"],
      ["PIS a Recolher", "C", "8,00"],
      ["COFINS sobre Faturamento", "D", "36,90"],
      ["COFINS a Recolher", "C", "36,90"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "776,20"],
      ["Estoque de Mercadorias", "C", "776,20"],
    ]);
    expect(estado.estoque[arroz]).toEqual({ quantidade: 40, valorCentavos: r("1.034,93") });
  });

  it("Op 7 — apuração do ICMS: compensa 819,00; saldo devedor de 171,00", () => {
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("990,00 C");
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("819,00 D");
    expect(passo(estado, apurarIcms(estado, { ano: 1, mes: 1 }), dia(30))).toEqual([
      ["ICMS a Recolher", "D", "819,00"],
      ["ICMS a Recuperar", "C", "819,00"],
    ]);
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("171,00 C");
  });

  it("Op 8 — pagamento do ICMS no Posto Fiscal, via banco", () => {
    expect(
      passo(
        estado,
        { tipo: "pagamento", obrigacao: "icms", valorCentavos: r("171,00"), meio: "bancos" },
        dia(30),
      ),
    ).toEqual([
      ["ICMS a Recolher", "D", "171,00"],
      ["Bancos Conta Movimento", "C", "171,00"],
    ]);
  });

  it("Op 9 — pagamento ao fornecedor, via banco", () => {
    expect(
      passo(
        estado,
        {
          tipo: "pagamento",
          obrigacao: "fornecedores",
          valorCentavos: r("3.000,00"),
          meio: "bancos",
        },
        dia(30),
      ),
    ).toEqual([
      ["Fornecedores", "D", "3.000,00"],
      ["Bancos Conta Movimento", "C", "3.000,00"],
    ]);
  });

  it("saldos finais (antes do encerramento)", () => {
    const esperados: Record<string, string> = {
      Caixa: "8.000,00 D",
      "Bancos Conta Movimento": "1.129,00 D",
      Clientes: "1.500,00 D",
      "Estoque de Mercadorias": "1.034,93 D",
      "ICMS a Recuperar": "0,00",
      Fornecedores: "0,00",
      "ICMS a Recolher": "0,00",
      "PIS a Recolher": "29,32 C",
      "COFINS a Recolher": "135,30 C",
      "Capital Social Subscrito": "10.000,00 C",
      "Receita Bruta de Vendas": "5.500,00 C",
      "ICMS sobre Vendas": "990,00 D",
      "PIS sobre Faturamento": "29,32 D",
      "COFINS sobre Faturamento": "135,30 D",
      "Custo das Mercadorias Vendidas (CMV)": "2.846,07 D",
    };
    for (const [conta, saldo] of Object.entries(esperados)) {
      expect(saldoDe(estado, conta), conta).toBe(saldo);
    }
    // Nenhuma outra conta do plano tem saldo.
    const comSaldo = balancete(estado)
      .linhas.filter((l) => l.saldoDevedorCentavos + l.saldoCredorCentavos > 0)
      .map((l) => l.nome);
    expect(comSaldo.every((nome) => nome in esperados)).toBe(true);
  });

  it("Balancete: total devedor = total credor = 15.664,62", () => {
    const b = balancete(estado);
    expect(reais(b.totalDevedorCentavos)).toBe("15.664,62");
    expect(reais(b.totalCredorCentavos)).toBe("15.664,62");
  });

  it("DRE do mês", () => {
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    expect(reais(d.totalReceitaBrutaCentavos)).toBe("5.500,00");
    expect(d.deducoes.map((l) => reais(l.valorCentavos))).toEqual(["990,00", "29,32", "135,30"]);
    expect(reais(d.receitaLiquidaCentavos)).toBe("4.345,38");
    expect(reais(d.totalCustosCentavos)).toBe("2.846,07");
    expect(reais(d.lucroBrutoCentavos)).toBe("1.499,31");
    expect(reais(d.resultadoCentavos)).toBe("1.499,31");
  });

  it("Balanço Patrimonial", () => {
    const bp = balanco(estado, dia(30));
    expect(reais(bp.ativo.totalCentavos)).toBe("11.663,93");
    expect(reais(bp.passivo.totalCirculanteCentavos)).toBe("164,62");
    expect(reais(bp.patrimonioLiquido.capitalSocialCentavos)).toBe("10.000,00");
    expect(reais(bp.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("1.499,31");
    expect(reais(bp.patrimonioLiquido.totalCentavos)).toBe("11.499,31");
    expect(reais(bp.totalPassivoEPatrimonioLiquidoCentavos)).toBe("11.663,93");
  });
});
