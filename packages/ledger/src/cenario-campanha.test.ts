import { describe, expect, it } from "vitest";
import {
  apurarIcms,
  balancete,
  balanco,
  criarEmpresa,
  depreciarMes,
  dre,
  type EstadoContabil,
} from "./index";
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
 * Teste dourado principal: docs/cenario-campanha.md, capítulos 1 a 7, centavo por
 * centavo. Os passos rodam em sequência sobre o mesmo estado.
 */
describe("cenário da campanha (teste dourado)", () => {
  let estado: EstadoContabil = criarEmpresa();
  const mes = { ano: 1, mes: 1 };

  const passo = (...args: Parameters<typeof executar>) => {
    const resultado = executar(...args);
    estado = resultado.estado;
    return resultado.linhas;
  };

  it("C1.3 — subscrição de R$ 300.000,00", () => {
    expect(passo(estado, { tipo: "subscricao", valorCentavos: r("300.000,00") }, dia(1))).toEqual([
      ["(−) Capital a Integralizar", "D", "300.000,00"],
      ["Capital Social Subscrito", "C", "300.000,00"],
    ]);
  });

  it("C1.4 — integralização de R$ 200.000,00 no banco", () => {
    expect(
      passo(
        estado,
        { tipo: "integralizacao", valorCentavos: r("200.000,00"), meio: "bancos" },
        dia(1),
      ),
    ).toEqual([
      ["Bancos Conta Movimento", "D", "200.000,00"],
      ["(−) Capital a Integralizar", "C", "200.000,00"],
    ]);
    expect(reais(balanco(estado, dia(1)).patrimonioLiquido.totalCentavos)).toBe("200.000,00");
  });

  it("C2.7 — imóvel de uso próprio, à vista", () => {
    expect(
      passo(
        estado,
        {
          tipo: "compra_imobilizado",
          itens: [
            { classe: "terrenos", valorCentavos: r("60.000,00") },
            { classe: "edificacoes", valorCentavos: r("120.000,00") },
          ],
          meio: "bancos",
        },
        dia(2),
      ),
    ).toEqual([
      ["Terrenos", "D", "60.000,00"],
      ["Edificações", "D", "120.000,00"],
      ["Bancos Conta Movimento", "C", "180.000,00"],
    ]);
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("20.000,00 D");
  });

  it("C3.8 — integralização dos R$ 100.000,00 restantes", () => {
    expect(
      passo(
        estado,
        { tipo: "integralizacao", valorCentavos: r("100.000,00"), meio: "bancos" },
        dia(3),
      ),
    ).toEqual([
      ["Bancos Conta Movimento", "D", "100.000,00"],
      ["(−) Capital a Integralizar", "C", "100.000,00"],
    ]);
  });

  it("C3.9 — móveis e equipamentos, à vista", () => {
    const moveis = passo(
      estado,
      {
        tipo: "compra_imobilizado",
        itens: [{ classe: "moveis_utensilios", valorCentavos: r("15.000,00") }],
        meio: "bancos",
      },
      dia(3),
    );
    const equipamentos = passo(
      estado,
      {
        tipo: "compra_imobilizado",
        itens: [{ classe: "equipamentos", valorCentavos: r("5.000,00") }],
        meio: "bancos",
      },
      dia(3),
    );
    expect([...moveis, ...equipamentos]).toEqual([
      ["Móveis e Utensílios", "D", "15.000,00"],
      ["Bancos Conta Movimento", "C", "15.000,00"],
      ["Equipamentos", "D", "5.000,00"],
      ["Bancos Conta Movimento", "C", "5.000,00"],
    ]);
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("100.000,00 D");
  });

  it("C4.10 — compra à vista via banco: 8.000 un × R$ 5,00", () => {
    expect(
      passo(estado, compraDeMercadorias(8000, "5,00", { tipo: "avista", meio: "bancos" }), dia(4)),
    ).toEqual([
      ["Estoque de Mercadorias", "D", "32.800,00"],
      ["ICMS a Recuperar", "D", "7.200,00"],
      ["Bancos Conta Movimento", "C", "40.000,00"],
    ]);
  });

  it("C4.11 — compra a prazo, 30 dias: 4.000 un × R$ 5,00", () => {
    expect(
      passo(estado, compraDeMercadorias(4000, "5,00", { tipo: "prazo", dias: 30 }), dia(4)),
    ).toEqual([
      ["Estoque de Mercadorias", "D", "16.400,00"],
      ["ICMS a Recuperar", "D", "3.600,00"],
      ["Fornecedores", "C", "20.000,00"],
    ]);
    expect(estado.estoque["mercadorias-diversas"]).toEqual({
      quantidade: 12000,
      valorCentavos: r("49.200,00"),
    });
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("60.000,00 D");
  });

  it("C5.12 — venda à vista: 50 un × R$ 10,00 (PIS 2,665 → 2,67)", () => {
    expect(passo(estado, vendaDeMercadorias(50, "10,00", { tipo: "avista" }), dia(5))).toEqual([
      ["Caixa", "D", "500,00"],
      ["Receita Bruta de Vendas", "C", "500,00"],
      ["ICMS sobre Vendas", "D", "90,00"],
      ["ICMS a Recolher", "C", "90,00"],
      ["PIS sobre Faturamento", "D", "2,67"],
      ["PIS a Recolher", "C", "2,67"],
      ["COFINS sobre Faturamento", "D", "12,30"],
      ["COFINS a Recolher", "C", "12,30"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "205,00"],
      ["Estoque de Mercadorias", "C", "205,00"],
    ]);
  });

  it("C5.13 — venda a prazo ao restaurante: 300 un × R$ 10,00", () => {
    expect(
      passo(estado, vendaDeMercadorias(300, "10,00", { tipo: "prazo", dias: 30 }), dia(5)),
    ).toEqual([
      ["Clientes", "D", "3.000,00"],
      ["Receita Bruta de Vendas", "C", "3.000,00"],
      ["ICMS sobre Vendas", "D", "540,00"],
      ["ICMS a Recolher", "C", "540,00"],
      ["PIS sobre Faturamento", "D", "15,99"],
      ["PIS a Recolher", "C", "15,99"],
      ["COFINS sobre Faturamento", "D", "73,80"],
      ["COFINS a Recolher", "C", "73,80"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "1.230,00"],
      ["Estoque de Mercadorias", "C", "1.230,00"],
    ]);
    expect(estado.estoque["mercadorias-diversas"]).toEqual({
      quantidade: 11650,
      valorCentavos: r("47.765,00"),
    });
  });

  it("C6.14 — pagamento parcial ao fornecedor", () => {
    expect(
      passo(
        estado,
        {
          tipo: "pagamento",
          obrigacao: "fornecedores",
          valorCentavos: r("10.000,00"),
          meio: "bancos",
        },
        dia(10),
      ),
    ).toEqual([
      ["Fornecedores", "D", "10.000,00"],
      ["Bancos Conta Movimento", "C", "10.000,00"],
    ]);
  });

  it("C6.15 — salários do mês e pagamento dos salários", () => {
    expect(
      passo(estado, { tipo: "provisao_salarios", valorCentavos: r("4.000,00") }, dia(28)),
    ).toEqual([
      ["Despesas com Salários", "D", "4.000,00"],
      ["Salários a Pagar", "C", "4.000,00"],
    ]);
    expect(
      passo(
        estado,
        { tipo: "pagamento", obrigacao: "salarios", valorCentavos: r("4.000,00"), meio: "bancos" },
        dia(28),
      ),
    ).toEqual([
      ["Salários a Pagar", "D", "4.000,00"],
      ["Bancos Conta Movimento", "C", "4.000,00"],
    ]);
  });

  it("C6.16 — energia elétrica", () => {
    expect(
      passo(
        estado,
        {
          tipo: "despesa",
          natureza: "energia_eletrica",
          valorCentavos: r("1.000,00"),
          meio: "bancos",
        },
        dia(28),
      ),
    ).toEqual([
      ["Despesa com Energia Elétrica", "D", "1.000,00"],
      ["Bancos Conta Movimento", "C", "1.000,00"],
    ]);
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("45.000,00 D");
  });

  it("C7.a — depreciação do mês", () => {
    expect(passo(estado, depreciarMes(estado, mes), dia(30))).toEqual([
      ["Despesa de Depreciação", "D", "400,00"],
      ["(−) Depreciação Acumulada — Edificações", "C", "400,00"],
      ["Despesa de Depreciação", "D", "125,00"],
      ["(−) Depreciação Acumulada — Móveis e Utensílios", "C", "125,00"],
      ["Despesa de Depreciação", "D", "83,33"],
      ["(−) Depreciação Acumulada — Equipamentos", "C", "83,33"],
    ]);
  });

  it("C7.b — apuração do ICMS: compensa 630,00; saldo credor de 10.170,00", () => {
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("630,00 C");
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("10.800,00 D");
    expect(passo(estado, apurarIcms(estado, mes), dia(30))).toEqual([
      ["ICMS a Recolher", "D", "630,00"],
      ["ICMS a Recuperar", "C", "630,00"],
    ]);
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("0,00");
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("10.170,00 D");
  });

  it("DRE do mês", () => {
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    const porNome = (linhasDre: typeof d.deducoes) =>
      Object.fromEntries(linhasDre.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(reais(d.totalReceitaBrutaCentavos)).toBe("3.500,00");
    expect(porNome(d.deducoes)).toEqual({
      "ICMS sobre Vendas": "630,00",
      "PIS sobre Faturamento": "18,66",
      "COFINS sobre Faturamento": "86,10",
    });
    expect(reais(d.receitaLiquidaCentavos)).toBe("2.765,24");
    expect(reais(d.totalCustosCentavos)).toBe("1.435,00");
    expect(reais(d.lucroBrutoCentavos)).toBe("1.330,24");
    expect(porNome(d.despesasOperacionais)).toEqual({
      "Despesas com Salários": "4.000,00",
      "Despesa com Energia Elétrica": "1.000,00",
      "Despesa de Depreciação": "608,33",
    });
    expect(reais(d.resultadoCentavos)).toBe("-4.278,09");
  });

  it("Balanço Patrimonial", () => {
    const bp = balanco(estado, dia(30));
    const porNome = (linhasBp: typeof bp.ativo.circulante) =>
      Object.fromEntries(linhasBp.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(porNome(bp.ativo.circulante)).toEqual({
      Caixa: "500,00",
      "Bancos Conta Movimento": "45.000,00",
      Clientes: "3.000,00",
      "Estoque de Mercadorias": "47.765,00",
      "ICMS a Recuperar": "10.170,00",
    });
    expect(reais(bp.ativo.totalCirculanteCentavos)).toBe("106.435,00");
    expect(
      bp.ativo.imobilizado.map((l) => [
        l.nome,
        reais(l.custoCentavos),
        reais(l.depreciacaoAcumuladaCentavos),
        reais(l.valorCentavos),
      ]),
    ).toEqual([
      ["Terrenos", "60.000,00", "0,00", "60.000,00"],
      ["Edificações", "120.000,00", "400,00", "119.600,00"],
      ["Móveis e Utensílios", "15.000,00", "125,00", "14.875,00"],
      ["Equipamentos", "5.000,00", "83,33", "4.916,67"],
    ]);
    expect(reais(bp.ativo.totalNaoCirculanteCentavos)).toBe("199.391,67");
    expect(reais(bp.ativo.totalCentavos)).toBe("305.826,67");

    expect(porNome(bp.passivo.circulante)).toEqual({
      Fornecedores: "10.000,00",
      "ICMS a Recolher": "0,00",
      "PIS a Recolher": "18,66",
      "COFINS a Recolher": "86,10",
      "Salários a Pagar": "0,00",
    });
    expect(reais(bp.passivo.totalCirculanteCentavos)).toBe("10.104,76");

    expect(porNome(bp.patrimonioLiquido.contas)).toEqual({
      "Capital Social Subscrito": "300.000,00",
      "(−) Capital a Integralizar": "0,00",
      "Lucros ou Prejuízos Acumulados": "0,00",
    });
    expect(reais(bp.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("-4.278,09");
    expect(reais(bp.patrimonioLiquido.totalCentavos)).toBe("295.721,91");
    expect(reais(bp.totalPassivoEPatrimonioLiquidoCentavos)).toBe("305.826,67");
  });

  it("Balancete: total devedor = total credor = 314.213,09", () => {
    const b = balancete(estado);
    expect(reais(b.totalDevedorCentavos)).toBe("314.213,09");
    expect(reais(b.totalCredorCentavos)).toBe("314.213,09");
  });
});
