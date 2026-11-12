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
import { dia, executar, reais, saldoDe } from "./testes/apoio";

/**
 * Teste dourado principal: docs/cenario-campanha.md, a campanha da hamburgueria,
 * centavo por centavo. Os passos rodam em sequência sobre o mesmo estado.
 * Os valores esperados foram calculados à mão, fora do motor (valores em centavos nas
 * operações; partidas como "D Conta 1.234,56", na ordem do razão).
 */

const mes = { ano: 1, mes: 1 };

interface Passo {
  readonly titulo: string;
  readonly dia: number;
  readonly operacao: Operacao;
  readonly linhas: readonly string[];
}

const PASSOS: readonly Passo[] = [
  {
    titulo: "1 — Subscrição do capital — R$ 100.000,00",
    dia: 1,
    operacao: { tipo: "subscricao", valorCentavos: 10000000 },
    linhas: ["D (−) Capital a Integralizar 100.000,00", "C Capital Social Subscrito 100.000,00"],
  },
  {
    titulo: "2 — Integralização de R$ 80.000,00 no banco",
    dia: 2,
    operacao: { tipo: "integralizacao", valorCentavos: 8000000, meio: "bancos" },
    linhas: ["D Bancos Conta Movimento 80.000,00", "C (−) Capital a Integralizar 80.000,00"],
  },
  {
    titulo:
      "3 — Compra do ponto comercial: terreno R$ 20.000,00 e edificação R$ 40.000,00, pelo banco",
    dia: 3,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [
        { classe: "terrenos", valorCentavos: 2000000 },
        { classe: "edificacoes", valorCentavos: 4000000 },
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
    titulo: "4 — Integralização final de R$ 20.000,00 no banco",
    dia: 4,
    operacao: { tipo: "integralizacao", valorCentavos: 2000000, meio: "bancos" },
    linhas: ["D Bancos Conta Movimento 20.000,00", "C (−) Capital a Integralizar 20.000,00"],
  },
  {
    titulo: "5 — Mesas e balcão por R$ 6.000,00, pelo banco",
    dia: 5,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [{ classe: "moveis_utensilios", valorCentavos: 600000 }],
      meio: "bancos",
    },
    linhas: ["D Móveis e Utensílios 6.000,00", "C Bancos Conta Movimento 6.000,00"],
  },
  {
    titulo: "6 — Chapa e freezer por R$ 12.000,00, pelo banco",
    dia: 6,
    operacao: {
      tipo: "compra_imobilizado",
      itens: [{ classe: "equipamentos", valorCentavos: 1200000 }],
      meio: "bancos",
    },
    linhas: ["D Equipamentos 12.000,00", "C Bancos Conta Movimento 12.000,00"],
  },
  {
    titulo: "7 — Compra à vista (banco) de 500 refrigerantes a R$ 3,00, sem tributos destacados",
    dia: 7,
    operacao: {
      tipo: "compra",
      itens: [{ produto: "refrigerante", quantidade: 500, precoUnitarioCentavos: 300 }],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "bancos" },
      semTributos: true,
    },
    linhas: ["D Estoque de Mercadorias 1.500,00", "C Bancos Conta Movimento 1.500,00"],
  },
  {
    titulo:
      "8 — Compra a prazo (nota c1), sem tributos destacados: 1.000 pães a R$ 1,00, 1.000 carnes a R$ 4,00, 1.000 queijos a R$ 1,00 e 1.000 alfaces a R$ 0,50",
    dia: 7,
    operacao: {
      tipo: "compra",
      nota: "c1",
      itens: [
        { produto: "pao", quantidade: 1000, precoUnitarioCentavos: 100 },
        { produto: "carne", quantidade: 1000, precoUnitarioCentavos: 400 },
        { produto: "queijo", quantidade: 1000, precoUnitarioCentavos: 100 },
        { produto: "alface", quantidade: 1000, precoUnitarioCentavos: 50 },
      ],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "prazo", dias: 30 },
      semTributos: true,
    },
    linhas: ["D Estoque de Insumos 6.500,00", "C Fornecedores 6.500,00"],
  },
  {
    titulo: "9 — Pagamento da nota c1 (R$ 6.500,00), pelo banco",
    dia: 8,
    operacao: {
      tipo: "pagamento",
      obrigacao: "fornecedores",
      valorCentavos: 650000,
      meio: "bancos",
    },
    linhas: ["D Fornecedores 6.500,00", "C Bancos Conta Movimento 6.500,00"],
  },
  {
    titulo:
      "10 — Inauguração: venda à vista de 300 hambúrgueres a R$ 20,00 e 200 refrigerantes a R$ 6,00, sem tributos destacados",
    dia: 9,
    operacao: {
      tipo: "venda",
      itens: [
        { produto: "hamburguer", quantidade: 300, precoUnitarioCentavos: 2000 },
        { produto: "refrigerante", quantidade: 200, precoUnitarioCentavos: 600 },
      ],
      condicao: { tipo: "avista" },
      semTributos: true,
    },
    linhas: [
      "D Caixa 7.200,00",
      "C Receita Bruta de Vendas 7.200,00",
      "D Custo das Mercadorias Vendidas (CMV) 600,00",
      "C Estoque de Mercadorias 600,00",
      "D Custo dos Produtos Vendidos (CPV) 1.950,00",
      "C Estoque de Insumos 1.950,00",
    ],
  },
  {
    titulo:
      "11 — Venda a prazo de 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00, sem tributos destacados",
    dia: 10,
    operacao: {
      tipo: "venda",
      itens: [
        { produto: "hamburguer", quantidade: 200, precoUnitarioCentavos: 2000 },
        { produto: "refrigerante", quantidade: 100, precoUnitarioCentavos: 600 },
      ],
      condicao: { tipo: "prazo", dias: 30 },
      semTributos: true,
    },
    linhas: [
      "D Clientes 4.600,00",
      "C Receita Bruta de Vendas 4.600,00",
      "D Custo das Mercadorias Vendidas (CMV) 300,00",
      "C Estoque de Mercadorias 300,00",
      "D Custo dos Produtos Vendidos (CPV) 1.300,00",
      "C Estoque de Insumos 1.300,00",
    ],
  },
  {
    titulo: "12 — Recebimento do cliente (R$ 4.600,00), pelo banco",
    dia: 11,
    operacao: { tipo: "recebimento", valorCentavos: 460000, meio: "bancos" },
    linhas: ["D Bancos Conta Movimento 4.600,00", "C Clientes 4.600,00"],
  },
  {
    titulo: "13 — Salários do mês: R$ 3.000,00, a pagar no mês seguinte",
    dia: 12,
    operacao: { tipo: "provisao_salarios", valorCentavos: 300000 },
    linhas: ["D Despesas com Salários 3.000,00", "C Salários a Pagar 3.000,00"],
  },
  {
    titulo: "14 — Energia elétrica de R$ 600,00, paga pelo banco",
    dia: 13,
    operacao: {
      tipo: "despesa",
      natureza: "energia_eletrica",
      valorCentavos: 60000,
      meio: "bancos",
    },
    linhas: ["D Despesa com Energia Elétrica 600,00", "C Bancos Conta Movimento 600,00"],
  },
  {
    titulo:
      "15 — Situação C — compra a prazo (nota c2) de insumos, de atacadista, com ICMS recuperável: 500 pães a R$ 1,00, 500 carnes a R$ 4,00, 500 queijos a R$ 1,00 e 500 alfaces a R$ 0,50",
    dia: 14,
    operacao: {
      tipo: "compra",
      nota: "c2",
      itens: [
        { produto: "pao", quantidade: 500, precoUnitarioCentavos: 100 },
        { produto: "carne", quantidade: 500, precoUnitarioCentavos: 400 },
        { produto: "queijo", quantidade: 500, precoUnitarioCentavos: 100 },
        { produto: "alface", quantidade: 500, precoUnitarioCentavos: 50 },
      ],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "prazo", dias: 30 },
    },
    linhas: [
      "D Estoque de Insumos 2.665,00",
      "D ICMS a Recuperar 585,00",
      "C Fornecedores 3.250,00",
    ],
  },
  {
    titulo:
      "16 — Situação B — compra à vista (banco), da fábrica, de 500 refrigerantes a R$ 3,00 para revenda, com IPI de 4% fora da base do ICMS",
    dia: 14,
    operacao: {
      tipo: "compra",
      itens: [{ produto: "refrigerante", quantidade: 500, precoUnitarioCentavos: 300 }],
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
    titulo:
      "17 — Situações A e E — compra à vista (caixa), da fábrica, de 20 unidades de material de limpeza a R$ 25,00 para uso e consumo, com IPI de 5% na base do ICMS e nenhum tributo recuperável",
    dia: 15,
    operacao: {
      tipo: "compra",
      itens: [{ produto: "material-de-limpeza", quantidade: 20, precoUnitarioCentavos: 2500 }],
      ipiAliquota: 500,
      freteCentavos: 0,
      condicao: { tipo: "avista", meio: "caixa" },
    },
    linhas: ["D Material de Consumo 525,00", "C Caixa 525,00"],
  },
  {
    titulo:
      "18 — Venda à vista, com tributos, de 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00",
    dia: 16,
    operacao: {
      tipo: "venda",
      itens: [
        { produto: "hamburguer", quantidade: 200, precoUnitarioCentavos: 2000 },
        { produto: "refrigerante", quantidade: 100, precoUnitarioCentavos: 600 },
      ],
      condicao: { tipo: "avista" },
    },
    linhas: [
      "D Caixa 4.600,00",
      "C Receita Bruta de Vendas 4.600,00",
      "D ICMS sobre Vendas 828,00",
      "C ICMS a Recolher 828,00",
      "D PIS sobre Faturamento 24,52",
      "C PIS a Recolher 24,52",
      "D COFINS sobre Faturamento 113,16",
      "C COFINS a Recolher 113,16",
      "D Custo das Mercadorias Vendidas (CMV) 270,00",
      "C Estoque de Mercadorias 270,00",
      "D Custo dos Produtos Vendidos (CPV) 1.183,00",
      "C Estoque de Insumos 1.183,00",
    ],
  },
  {
    titulo: "19 — Devolução de 100 carnes da nota c2",
    dia: 17,
    operacao: {
      tipo: "devolucao_compra",
      nota: "c2",
      itens: [{ produto: "carne", quantidade: 100 }],
    },
    linhas: ["D Fornecedores 400,00", "C Estoque de Insumos 328,00", "C ICMS a Recuperar 72,00"],
  },
  {
    titulo: "20 — Abatimento de R$ 50,00 sobre o pão da nota c2",
    dia: 18,
    operacao: { tipo: "abatimento_compra", nota: "c2", produto: "pao", valorCentavos: 5000 },
    linhas: ["D Fornecedores 50,00", "C Estoque de Insumos 50,00"],
  },
  {
    titulo: "21 — Compra a prazo (nota c3) de 500 carnes a R$ 4,00, com 10% de desconto na nota",
    dia: 19,
    operacao: {
      tipo: "compra",
      nota: "c3",
      itens: [{ produto: "carne", quantidade: 500, precoUnitarioCentavos: 400 }],
      ipiAliquota: 0,
      freteCentavos: 0,
      condicao: { tipo: "prazo", dias: 30 },
      descontoComercial: 1000,
    },
    linhas: [
      "D Estoque de Insumos 1.476,00",
      "D ICMS a Recuperar 324,00",
      "C Fornecedores 1.800,00",
    ],
  },
  {
    titulo:
      "22 — Pagamento antecipado da nota c2 (R$ 2.800,00), pelo banco, com desconto de R$ 56,00",
    dia: 20,
    operacao: {
      tipo: "pagamento",
      obrigacao: "fornecedores",
      valorCentavos: 280000,
      meio: "bancos",
      descontoFinanceiroCentavos: 5600,
    },
    linhas: [
      "D Fornecedores 2.800,00",
      "C Bancos Conta Movimento 2.744,00",
      "C Descontos Financeiros Obtidos 56,00",
    ],
  },
  {
    titulo:
      "23 — Encomenda a prazo (nota v1): 200 hambúrgueres a R$ 20,00 e 100 refrigerantes a R$ 6,00, com 10% de desconto na nota",
    dia: 21,
    operacao: {
      tipo: "venda",
      nota: "v1",
      itens: [
        { produto: "hamburguer", quantidade: 200, precoUnitarioCentavos: 2000 },
        { produto: "refrigerante", quantidade: 100, precoUnitarioCentavos: 600 },
      ],
      condicao: { tipo: "prazo", dias: 30 },
      descontoIncondicional: 1000,
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
      "D Custo das Mercadorias Vendidas (CMV) 270,00",
      "C Estoque de Mercadorias 270,00",
      "D Custo dos Produtos Vendidos (CPV) 1.119,17",
      "C Estoque de Insumos 1.119,17",
    ],
  },
  {
    titulo: "24 — Devolução de 20 refrigerantes da nota v1",
    dia: 21,
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
      "D Estoque de Mercadorias 54,00",
      "C Custo das Mercadorias Vendidas (CMV) 54,00",
    ],
  },
  {
    titulo: "25 — Abatimento de R$ 100,00 sobre a encomenda",
    dia: 22,
    operacao: { tipo: "abatimento_venda", valorCentavos: 10000, contrapartida: "clientes" },
    linhas: ["D Abatimentos sobre Vendas 100,00", "C Clientes 100,00"],
  },
  {
    titulo:
      "26 — Recebimento antecipado da nota v1 (R$ 3.932,00), pelo banco, com desconto de R$ 78,64",
    dia: 23,
    operacao: {
      tipo: "recebimento",
      valorCentavos: 393200,
      meio: "bancos",
      descontoFinanceiroCentavos: 7864,
    },
    linhas: [
      "D Bancos Conta Movimento 3.853,36",
      "D Descontos Financeiros Concedidos 78,64",
      "C Clientes 3.932,00",
    ],
  },
  {
    titulo: "27 — Recebimento de 300 refrigerantes em consignação, a R$ 3,00 — sem lançamento",
    dia: 24,
    operacao: {
      tipo: "recebimento_consignacao",
      produto: "refrigerante",
      quantidade: 300,
      precoUnitarioCentavos: 300,
    },
    linhas: [],
  },
  {
    titulo: "28 — Venda à vista de 150 refrigerantes consignados a R$ 6,00",
    dia: 25,
    operacao: {
      tipo: "venda_consignada",
      produto: "refrigerante",
      quantidade: 150,
      precoUnitarioCentavos: 600,
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
      "D Custo das Mercadorias Vendidas (CMV) 396,94",
      "C Estoque de Mercadorias 396,94",
    ],
  },
  {
    titulo: "29 — Devolução ao consignante de 150 refrigerantes — sem lançamento",
    dia: 26,
    operacao: { tipo: "devolucao_consignacao", produto: "refrigerante", quantidade: 150 },
    linhas: [],
  },
  {
    titulo:
      "30 — Situação D — compra a prazo (nota c4), da fábrica, de 400 embalagens a R$ 1,00 para industrialização, com IPI de 5% recuperável",
    dia: 27,
    operacao: {
      tipo: "compra",
      nota: "c4",
      itens: [{ produto: "embalagem", quantidade: 400, precoUnitarioCentavos: 100 }],
      ipiAliquota: 500,
      freteCentavos: 0,
      condicao: { tipo: "prazo", dias: 30 },
      ipiRecuperavel: true,
    },
    linhas: [
      "D Estoque de Insumos 328,00",
      "D ICMS a Recuperar 72,00",
      "D IPI a Recuperar 20,00",
      "C Fornecedores 420,00",
    ],
  },
  {
    titulo: "31 — Produção de 300 hambúrgueres congelados",
    dia: 28,
    operacao: { tipo: "producao", produto: "hamburguer-congelado", quantidade: 300 },
    linhas: ["D Produtos Acabados 1.261,00", "C Estoque de Insumos 1.261,00"],
  },
  {
    titulo:
      "32 — Venda a prazo (nota v2), para o mercado, de 250 hambúrgueres congelados a R$ 12,00, com IPI de 5% por fora",
    dia: 28,
    operacao: {
      tipo: "venda",
      nota: "v2",
      itens: [{ produto: "hamburguer-congelado", quantidade: 250, precoUnitarioCentavos: 1200 }],
      condicao: { tipo: "prazo", dias: 30 },
      ipiAliquota: 500,
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
      "D Custo dos Produtos Vendidos (CPV) 1.050,83",
      "C Produtos Acabados 1.050,83",
    ],
  },
  {
    titulo: "33 — Depreciação do mês",
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
    titulo: "34 — Inventário do material de limpeza: restam 8 unidades",
    dia: 30,
    operacao: { tipo: "inventario_consumo", produto: "material-de-limpeza", quantidadeRestante: 8 },
    linhas: ["D Despesa com Material de Consumo 315,00", "C Material de Consumo 315,00"],
  },
  {
    titulo: "35 — Apuração do ICMS",
    dia: 30,
    operacao: apurarIcms(criarEmpresa(), mes),
    linhas: ["D ICMS a Recolher 1.260,00", "C ICMS a Recuperar 1.260,00"],
  },
  {
    titulo: "36 — Apuração do IPI",
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
      refrigerante: "520 un. = 1.376,06",
      pao: "600 un. = 508,50",
      carne: "700 un. = 2.368,33",
      queijo: "600 un. = 546,00",
      alface: "600 un. = 273,00",
      "material-de-limpeza": "8 un. = 210,00",
      embalagem: "100 un. = 82,00",
      "hamburguer-congelado": "50 un. = 210,17",
    });
    expect(estado.consignado.refrigerante?.quantidade).toBe(0);
  });

  it("saldos depois das apurações", () => {
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("0,00");
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("995,76 C");
    expect(saldoDe(estado, "IPI a Recuperar")).toBe("0,00");
    expect(saldoDe(estado, "IPI a Recolher")).toBe("130,00 C");
    expect(saldoDe(estado, "Fornecedores")).toBe("2.670,00 C");
    expect(saldoDe(estado, "Clientes")).toBe("3.150,00 D");
  });

  it("DRE do mês", () => {
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    const porNome = (linhasDre: typeof d.deducoes) =>
      Object.fromEntries(linhasDre.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(reais(d.totalReceitaBrutaCentavos)).toBe("24.900,00");
    expect(porNome(d.deducoes)).toEqual({
      "ICMS sobre Vendas": "2.255,76",
      "PIS sobre Faturamento": "66,80",
      "COFINS sobre Faturamento": "308,28",
      "Devoluções de Vendas": "108,00",
      "Abatimentos sobre Vendas": "100,00",
      "Descontos Incondicionais Concedidos": "460,00",
    });
    expect(reais(d.receitaLiquidaCentavos)).toBe("21.601,16");
    expect(porNome(d.custos)).toEqual({
      "Custo das Mercadorias Vendidas (CMV)": "1.782,94",
      "Custo dos Produtos Vendidos (CPV)": "6.603,00",
    });
    expect(reais(d.lucroBrutoCentavos)).toBe("13.215,22");
    expect(porNome(d.despesasOperacionais)).toEqual({
      "Despesas com Salários": "3.000,00",
      "Despesa com Energia Elétrica": "600,00",
      "Despesa de Depreciação": "383,33",
      "Despesa com Material de Consumo": "315,00",
    });
    expect(porNome(d.receitasFinanceiras)).toEqual({
      "Descontos Financeiros Obtidos": "56,00",
    });
    expect(porNome(d.despesasFinanceiras)).toEqual({
      "Descontos Financeiros Concedidos": "78,64",
    });
    expect(reais(d.resultadoFinanceiroCentavos)).toBe("-22,64");
    expect(reais(d.resultadoCentavos)).toBe("8.894,25");
  });

  it("Balanço Patrimonial", () => {
    const bp = balanco(estado, dia(30));
    const porNome = (linhasBp: typeof bp.ativo.circulante) =>
      Object.fromEntries(linhasBp.map((l) => [l.nome, reais(l.valorCentavos)]));

    expect(porNome(bp.ativo.circulante)).toEqual({
      Caixa: "12.175,00",
      "Bancos Conta Movimento": "17.549,36",
      Clientes: "3.150,00",
      "Estoque de Mercadorias": "1.376,06",
      "ICMS a Recuperar": "0,00",
      "Estoque de Insumos": "3.777,83",
      "Produtos Acabados": "210,17",
      "Material de Consumo": "210,00",
      "IPI a Recuperar": "0,00",
    });
    expect(reais(bp.ativo.totalCirculanteCentavos)).toBe("38.448,42");
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
    expect(reais(bp.ativo.totalCentavos)).toBe("116.065,09");

    expect(porNome(bp.passivo.circulante)).toEqual({
      Fornecedores: "2.670,00",
      "ICMS a Recolher": "995,76",
      "PIS a Recolher": "66,80",
      "COFINS a Recolher": "308,28",
      "Salários a Pagar": "3.000,00",
      "IPI a Recolher": "130,00",
    });
    expect(reais(bp.passivo.totalCirculanteCentavos)).toBe("7.170,84");

    expect(porNome(bp.patrimonioLiquido.contas)).toEqual({
      "Capital Social Subscrito": "100.000,00",
      "(−) Capital a Integralizar": "0,00",
      "Lucros ou Prejuízos Acumulados": "0,00",
    });
    expect(reais(bp.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("8.894,25");
    expect(reais(bp.patrimonioLiquido.totalCentavos)).toBe("108.894,25");
    expect(reais(bp.totalPassivoEPatrimonioLiquidoCentavos)).toBe("116.065,09");
  });

  it("Balancete: total devedor = total credor = 132.510,17", () => {
    const b = balancete(estado);
    expect(reais(b.totalDevedorCentavos)).toBe("132.510,17");
    expect(reais(b.totalCredorCentavos)).toBe("132.510,17");
  });
});
