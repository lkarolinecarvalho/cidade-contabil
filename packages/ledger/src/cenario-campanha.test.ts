import { describe, expect, it } from "vitest";
import {
  apurarIcms,
  apurarIpi,
  balancete,
  balanco,
  CATALOGO_DA_HAMBURGUERIA,
  criarEmpresa,
  depreciarMes,
  dre,
  type EstadoContabil,
  type Operacao,
} from "./index";
import { dia, executar, r, reais, saldoDe } from "./testes/apoio";

/**
 * Teste dourado principal: docs/cenario-campanha.md, a campanha da hamburgueria,
 * centavo por centavo. Os passos rodam em sequência sobre o mesmo estado.
 * Os valores esperados foram calculados à mão, fora do motor.
 */

const item = (produto: string, quantidade: number, preco: string) => ({
  produto,
  quantidade,
  precoUnitarioCentavos: r(preco),
});
const aPrazo = { tipo: "prazo", dias: 30 } as const;
const mes = { ano: 1, mes: 1 };

interface Passo {
  readonly titulo: string;
  readonly dia: number;
  readonly operacao: Operacao;
  /** Partidas esperadas, como "D Conta 1.234,56", na ordem do razão. */
  readonly linhas: readonly string[];
}

const PASSOS: readonly Passo[] = [
  {
    titulo: "1 — subscrição do capital de R$ 100.000,00",
    dia: 1,
    operacao: { tipo: "subscricao", valorCentavos: r("100.000,00") },
    linhas: ["D (−) Capital a Integralizar 100.000,00", "C Capital Social Subscrito 100.000,00"],
  },
  {
    titulo: "2 — integralização de R$ 80.000,00 no banco",
    dia: 2,
    operacao: { tipo: "integralizacao", valorCentavos: r("80.000,00"), meio: "bancos" },
    linhas: ["D Bancos Conta Movimento 80.000,00", "C (−) Capital a Integralizar 80.000,00"],
  },
  {
    titulo: "3 — ponto comercial: terreno e edificação, pelo banco",
    dia: 3,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [
        { classe: "terrenos", valorCentavos: r("20.000,00") },
        { classe: "edificacoes", valorCentavos: r("40.000,00") },
      ],
      meio: "bancos",
    },
    linhas: [
      "D Terrenos 20.000,00",
      "D Edificações 40.000,00",
      "C Bancos Conta Movimento 60.000,00",
    ],
  },
  {
    titulo: "4 — integralização final de R$ 20.000,00",
    dia: 4,
    operacao: { tipo: "integralizacao", valorCentavos: r("20.000,00"), meio: "bancos" },
    linhas: ["D Bancos Conta Movimento 20.000,00", "C (−) Capital a Integralizar 20.000,00"],
  },
  {
    titulo: "5 — mesas e balcão",
    dia: 5,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [{ classe: "moveis_utensilios", valorCentavos: r("6.000,00") }],
      meio: "bancos",
    },
    linhas: ["D Móveis e Utensílios 6.000,00", "C Bancos Conta Movimento 6.000,00"],
  },
  {
    titulo: "6 — chapa e freezer",
    dia: 5,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [{ classe: "equipamentos", valorCentavos: r("12.000,00") }],
      meio: "bancos",
    },
    linhas: ["D Equipamentos 12.000,00", "C Bancos Conta Movimento 12.000,00"],
  },
  {
    titulo: "7 — refrigerante à vista, com IPI de 4% no custo",
    dia: 6,
    operacao: {
      tipo: "compra",
      itens: [item("refrigerante", 500, "3,00")],
      ipiAliquota: 400,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "bancos" },
    },
    linhas: [
      "D Estoque de Mercadorias 1.290,00",
      "D ICMS a Recuperar 270,00",
      "C Bancos Conta Movimento 1.560,00",
    ],
  },
  {
    titulo: "8 — insumos a prazo, nota c1 com quatro itens",
    dia: 7,
    operacao: {
      tipo: "compra",
      nota: "c1",
      itens: [
        item("pao", 1000, "1,00"),
        item("carne", 1000, "4,00"),
        item("queijo", 1000, "1,00"),
        item("alface", 1000, "0,50"),
      ],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: aPrazo,
    },
    linhas: [
      "D Estoque de Insumos 5.330,00",
      "D ICMS a Recuperar 1.170,00",
      "C Fornecedores 6.500,00",
    ],
  },
  {
    titulo: "9 — inauguração: 300 hambúrgueres e 200 refrigerantes à vista",
    dia: 8,
    operacao: {
      tipo: "venda",
      itens: [item("hamburguer", 300, "20,00"), item("refrigerante", 200, "6,00")],
      condicao: { tipo: "avista" },
    },
    linhas: [
      "D Caixa 7.200,00",
      "C Receita Bruta de Vendas 7.200,00",
      "D ICMS sobre Vendas 1.296,00",
      "C ICMS a Recolher 1.296,00",
      "D PIS sobre Faturamento 38,38",
      "C PIS a Recolher 38,38",
      "D COFINS sobre Faturamento 177,12",
      "C COFINS a Recolher 177,12",
      "D Custo das Mercadorias Vendidas (CMV) 516,00",
      "C Estoque de Mercadorias 516,00",
      "D Custo dos Produtos Vendidos (CPV) 1.599,00",
      "C Estoque de Insumos 1.599,00",
    ],
  },
  {
    titulo: "10 — devolução de 100 carnes da nota c1",
    dia: 9,
    operacao: {
      tipo: "devolucao_compra",
      nota: "c1",
      itens: [{ produto: "carne", quantidade: 100 }],
    },
    linhas: ["D Fornecedores 400,00", "C Estoque de Insumos 328,00", "C ICMS a Recuperar 72,00"],
  },
  {
    titulo: "11 — abatimento de R$ 100,00 sobre o pão da nota c1",
    dia: 10,
    operacao: {
      tipo: "abatimento_compra",
      nota: "c1",
      produto: "pao",
      valorCentavos: r("100,00"),
    },
    linhas: ["D Fornecedores 100,00", "C Estoque de Insumos 100,00"],
  },
  {
    titulo: "12 — carne a prazo com 10% de desconto na nota (c2)",
    dia: 11,
    operacao: {
      tipo: "compra",
      nota: "c2",
      itens: [item("carne", 500, "4,00")],
      ipiAliquota: 0,
      freteCentavos: 0,
      descontoComercial: 1000,
      condicao: aPrazo,
    },
    linhas: [
      "D Estoque de Insumos 1.476,00",
      "D ICMS a Recuperar 324,00",
      "C Fornecedores 1.800,00",
    ],
  },
  {
    titulo: "13 — pagamento antecipado da nota c1, com desconto de R$ 120,00",
    dia: 12,
    operacao: {
      tipo: "pagamento",
      obrigacao: "fornecedores",
      valorCentavos: r("6.000,00"),
      meio: "bancos",
      descontoFinanceiroCentavos: r("120,00"),
    },
    linhas: [
      "D Fornecedores 6.000,00",
      "C Bancos Conta Movimento 5.880,00",
      "C Descontos Financeiros Obtidos 120,00",
    ],
  },
  {
    titulo: "14 — material de limpeza à vista, pelo caixa",
    dia: 13,
    operacao: {
      tipo: "compra",
      itens: [item("material-de-limpeza", 20, "25,00")],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "caixa" },
    },
    linhas: ["D Material de Consumo 500,00", "C Caixa 500,00"],
  },
  {
    titulo: "15 — encomenda a prazo (v1), com 10% de desconto na nota",
    dia: 14,
    operacao: {
      tipo: "venda",
      nota: "v1",
      itens: [item("hamburguer", 200, "20,00"), item("refrigerante", 100, "6,00")],
      descontoIncondicional: 1000,
      condicao: aPrazo,
    },
    linhas: [
      "D Clientes 4.140,00",
      "D Descontos Incondicionais Concedidos 460,00",
      "C Receita Bruta de Vendas 4.600,00",
      "D ICMS sobre Vendas 745,20",
      "C ICMS a Recolher 745,20",
      "D PIS sobre Faturamento 22,07",
      "C PIS a Recolher 22,07",
      "D COFINS sobre Faturamento 101,84",
      "C COFINS a Recolher 101,84",
      "D Custo das Mercadorias Vendidas (CMV) 258,00",
      "C Estoque de Mercadorias 258,00",
      "D Custo dos Produtos Vendidos (CPV) 1.007,61",
      "C Estoque de Insumos 1.007,61",
    ],
  },
  {
    titulo: "16 — devolução de 20 refrigerantes da nota v1",
    dia: 15,
    operacao: {
      tipo: "devolucao_venda",
      nota: "v1",
      itens: [{ produto: "refrigerante", quantidade: 20 }],
    },
    linhas: [
      "D Devoluções de Vendas 108,00",
      "C Clientes 108,00",
      "D ICMS a Recolher 19,44",
      "C ICMS sobre Vendas 19,44",
      "D PIS a Recolher 0,58",
      "C PIS sobre Faturamento 0,58",
      "D COFINS a Recolher 2,66",
      "C COFINS sobre Faturamento 2,66",
      "D Estoque de Mercadorias 51,60",
      "C Custo das Mercadorias Vendidas (CMV) 51,60",
    ],
  },
  {
    titulo: "17 — abatimento de R$ 100,00 sobre a encomenda",
    dia: 16,
    operacao: { tipo: "abatimento_venda", valorCentavos: r("100,00"), contrapartida: "clientes" },
    linhas: ["D Abatimentos sobre Vendas 100,00", "C Clientes 100,00"],
  },
  {
    titulo: "18 — recebimento antecipado da nota v1, com desconto de R$ 78,64",
    dia: 17,
    operacao: {
      tipo: "recebimento",
      valorCentavos: r("3.932,00"),
      meio: "bancos",
      descontoFinanceiroCentavos: r("78,64"),
    },
    linhas: [
      "D Bancos Conta Movimento 3.853,36",
      "D Descontos Financeiros Concedidos 78,64",
      "C Clientes 3.932,00",
    ],
  },
  {
    titulo: "19 — 300 refrigerantes recebidos em consignação: sem lançamento",
    dia: 18,
    operacao: {
      tipo: "recebimento_consignacao",
      produto: "refrigerante",
      quantidade: 300,
      precoUnitarioCentavos: r("3,00"),
    },
    linhas: [],
  },
  {
    titulo: "20 — venda à vista de 150 refrigerantes consignados",
    dia: 19,
    operacao: {
      tipo: "venda_consignada",
      produto: "refrigerante",
      quantidade: 150,
      precoUnitarioCentavos: r("6,00"),
      condicao: { tipo: "avista" },
    },
    linhas: [
      "D Estoque de Mercadorias 369,00",
      "D ICMS a Recuperar 81,00",
      "C Fornecedores 450,00",
      "D Caixa 900,00",
      "C Receita Bruta de Vendas 900,00",
      "D ICMS sobre Vendas 162,00",
      "C ICMS a Recolher 162,00",
      "D PIS sobre Faturamento 4,80",
      "C PIS a Recolher 4,80",
      "D COFINS sobre Faturamento 22,14",
      "C COFINS a Recolher 22,14",
      "D Custo das Mercadorias Vendidas (CMV) 379,70",
      "C Estoque de Mercadorias 379,70",
    ],
  },
  {
    titulo: "21 — devolução ao consignante de 150 refrigerantes: sem lançamento",
    dia: 20,
    operacao: { tipo: "devolucao_consignacao", produto: "refrigerante", quantidade: 150 },
    linhas: [],
  },
  {
    titulo: "22 — salários do mês, a pagar no mês seguinte",
    dia: 21,
    operacao: { tipo: "provisao_salarios", valorCentavos: r("3.000,00") },
    linhas: ["D Despesas com Salários 3.000,00", "C Salários a Pagar 3.000,00"],
  },
  {
    titulo: "23 — energia elétrica, paga pelo banco",
    dia: 22,
    operacao: {
      tipo: "despesa",
      natureza: "energia_eletrica",
      valorCentavos: r("600,00"),
      meio: "bancos",
    },
    linhas: ["D Despesa com Energia Elétrica 600,00", "C Bancos Conta Movimento 600,00"],
  },
  {
    titulo: "24 — embalagens a prazo (c3), com IPI de 5% recuperável",
    dia: 23,
    operacao: {
      tipo: "compra",
      nota: "c3",
      itens: [item("embalagem", 400, "1,00")],
      ipiAliquota: 500,
      ipiRecuperavel: true,
      freteCentavos: 0,
      condicao: aPrazo,
    },
    linhas: [
      "D Estoque de Insumos 328,00",
      "D ICMS a Recuperar 72,00",
      "D IPI a Recuperar 20,00",
      "C Fornecedores 420,00",
    ],
  },
  {
    titulo: "25 — produção de 300 hambúrgueres congelados",
    dia: 24,
    operacao: { tipo: "producao", produto: "hamburguer-congelado", quantidade: 300 },
    linhas: ["D Produtos Acabados 1.185,27", "C Estoque de Insumos 1.185,27"],
  },
  {
    titulo: "26 — venda a prazo (v2) de 250 congelados, com IPI de 5%",
    dia: 25,
    operacao: {
      tipo: "venda",
      nota: "v2",
      itens: [item("hamburguer-congelado", 250, "12,00")],
      ipiAliquota: 500,
      condicao: aPrazo,
    },
    linhas: [
      "D Clientes 3.150,00",
      "C Receita Bruta de Vendas 3.000,00",
      "C IPI a Recolher 150,00",
      "D ICMS sobre Vendas 540,00",
      "C ICMS a Recolher 540,00",
      "D PIS sobre Faturamento 15,99",
      "C PIS a Recolher 15,99",
      "D COFINS sobre Faturamento 73,80",
      "C COFINS a Recolher 73,80",
      "D Custo dos Produtos Vendidos (CPV) 987,73",
      "C Produtos Acabados 987,73",
    ],
  },
  {
    titulo: "27 — depreciação do mês",
    dia: 30,
    operacao: depreciarMes(criarEmpresa(), mes),
    linhas: [
      "D Despesa de Depreciação 133,33",
      "C (−) Depreciação Acumulada — Edificações 133,33",
      "D Despesa de Depreciação 50,00",
      "C (−) Depreciação Acumulada — Móveis e Utensílios 50,00",
      "D Despesa de Depreciação 200,00",
      "C (−) Depreciação Acumulada — Equipamentos 200,00",
    ],
  },
  {
    titulo: "28 — inventário do material de limpeza: restam 8 unidades",
    dia: 30,
    operacao: {
      tipo: "inventario_consumo",
      produto: "material-de-limpeza",
      quantidadeRestante: 8,
    },
    linhas: ["D Despesa com Material de Consumo 300,00", "C Material de Consumo 300,00"],
  },
  {
    titulo: "29 — apuração do ICMS",
    dia: 30,
    operacao: apurarIcms(criarEmpresa(), mes),
    linhas: ["D ICMS a Recolher 1.845,00", "C ICMS a Recuperar 1.845,00"],
  },
  {
    titulo: "30 — apuração do IPI",
    dia: 30,
    operacao: apurarIpi(criarEmpresa(), mes),
    linhas: ["D IPI a Recolher 20,00", "C IPI a Recuperar 20,00"],
  },
];

describe("cenário da campanha (teste dourado)", () => {
  let estado: EstadoContabil = criarEmpresa({ catalogo: CATALOGO_DA_HAMBURGUERIA });

  for (const passo of PASSOS) {
    it(passo.titulo, () => {
      const resultado = executar(estado, passo.operacao, dia(passo.dia));
      estado = resultado.estado;
      expect(resultado.linhas.map(([conta, lado, valor]) => `${lado} ${conta} ${valor}`)).toEqual(
        passo.linhas,
      );
    });
  }

  it("estoque no fim do mês, item por item", () => {
    const emEstoque = Object.fromEntries(
      Object.entries(estado.estoque).map(([produto, saldo]) => [
        produto,
        `${saldo.quantidade} un. = ${reais(saldo.valorCentavos)}`,
      ]),
    );
    expect(emEstoque).toEqual({
      refrigerante: "220 un. = 556,90",
      pao: "500 un. = 338,57",
      carne: "600 un. = 1.878,55",
      queijo: "500 un. = 410,00",
      alface: "500 un. = 205,00",
      "material-de-limpeza": "8 un. = 200,00",
      embalagem: "100 un. = 82,00",
      "hamburguer-congelado": "50 un. = 197,54",
    });
    expect(estado.consignado.refrigerante?.quantidade).toBe(0);
  });

  it("saldos depois das apurações", () => {
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("0,00");
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("878,76 C");
    expect(saldoDe(estado, "IPI a Recuperar")).toBe("0,00");
    expect(saldoDe(estado, "IPI a Recolher")).toBe("130,00 C");
    expect(saldoDe(estado, "Fornecedores")).toBe("2.670,00 C");
    expect(saldoDe(estado, "Clientes")).toBe("3.150,00 D");
  });

  it("DRE do mês", () => {
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    const porNome = (linhasDre: typeof d.deducoes) =>
      Object.fromEntries(linhasDre.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(reais(d.totalReceitaBrutaCentavos)).toBe("15.700,00");
    expect(porNome(d.deducoes)).toEqual({
      "ICMS sobre Vendas": "2.723,76",
      "PIS sobre Faturamento": "80,66",
      "COFINS sobre Faturamento": "372,24",
      "Devoluções de Vendas": "108,00",
      "Abatimentos sobre Vendas": "100,00",
      "Descontos Incondicionais Concedidos": "460,00",
    });
    expect(reais(d.receitaLiquidaCentavos)).toBe("11.855,34");
    expect(porNome(d.custos)).toEqual({
      "Custo das Mercadorias Vendidas (CMV)": "1.102,10",
      "Custo dos Produtos Vendidos (CPV)": "3.594,34",
    });
    expect(reais(d.lucroBrutoCentavos)).toBe("7.158,90");
    expect(porNome(d.despesasOperacionais)).toEqual({
      "Despesas com Salários": "3.000,00",
      "Despesa com Energia Elétrica": "600,00",
      "Despesa de Depreciação": "383,33",
      "Despesa com Material de Consumo": "300,00",
    });
    expect(porNome(d.receitasFinanceiras)).toEqual({ "Descontos Financeiros Obtidos": "120,00" });
    expect(porNome(d.despesasFinanceiras)).toEqual({
      "Descontos Financeiros Concedidos": "78,64",
    });
    expect(reais(d.resultadoFinanceiroCentavos)).toBe("41,36");
    expect(reais(d.resultadoCentavos)).toBe("2.916,93");
  });

  it("Balanço Patrimonial", () => {
    const bp = balanco(estado, dia(30));
    const porNome = (linhasBp: typeof bp.ativo.circulante) =>
      Object.fromEntries(linhasBp.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(porNome(bp.ativo.circulante)).toEqual({
      Caixa: "7.600,00",
      "Bancos Conta Movimento": "17.813,36",
      Clientes: "3.150,00",
      "Estoque de Mercadorias": "556,90",
      "ICMS a Recuperar": "0,00",
      "Estoque de Insumos": "2.914,12",
      "Produtos Acabados": "197,54",
      "Material de Consumo": "200,00",
      "IPI a Recuperar": "0,00",
    });
    expect(reais(bp.ativo.totalCirculanteCentavos)).toBe("32.431,92");
    expect(
      bp.ativo.imobilizado.map((l) => [
        l.nome,
        reais(l.custoCentavos),
        reais(l.depreciacaoAcumuladaCentavos),
        reais(l.valorCentavos),
      ]),
    ).toEqual([
      ["Terrenos", "20.000,00", "0,00", "20.000,00"],
      ["Edificações", "40.000,00", "133,33", "39.866,67"],
      ["Móveis e Utensílios", "6.000,00", "50,00", "5.950,00"],
      ["Equipamentos", "12.000,00", "200,00", "11.800,00"],
    ]);
    expect(reais(bp.ativo.totalNaoCirculanteCentavos)).toBe("77.616,67");
    expect(reais(bp.ativo.totalCentavos)).toBe("110.048,59");

    expect(porNome(bp.passivo.circulante)).toEqual({
      Fornecedores: "2.670,00",
      "ICMS a Recolher": "878,76",
      "PIS a Recolher": "80,66",
      "COFINS a Recolher": "372,24",
      "Salários a Pagar": "3.000,00",
      "IPI a Recolher": "130,00",
    });
    expect(reais(bp.passivo.totalCirculanteCentavos)).toBe("7.131,66");

    expect(porNome(bp.patrimonioLiquido.contas)).toEqual({
      "Capital Social Subscrito": "100.000,00",
      "(−) Capital a Integralizar": "0,00",
      "Lucros ou Prejuízos Acumulados": "0,00",
    });
    expect(reais(bp.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("2.916,93");
    expect(reais(bp.patrimonioLiquido.totalCentavos)).toBe("102.916,93");
    expect(reais(bp.totalPassivoEPatrimonioLiquidoCentavos)).toBe("110.048,59");
  });

  it("Balancete: total devedor = total credor = 123.334,99", () => {
    const b = balancete(estado);
    expect(reais(b.totalDevedorCentavos)).toBe("123.334,99");
    expect(reais(b.totalCredorCentavos)).toBe("123.334,99");
  });
});
