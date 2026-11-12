import { describe, expect, it } from "vitest";
import { ratear } from "./comercial";
import {
  apurarIpi,
  balanco,
  CATALOGO_DA_HAMBURGUERIA,
  criarEmpresa,
  dre,
  ErroDeOperacao,
  type EstadoContabil,
  NOTAS_DIDATICAS,
  type Operacao,
  preverLancamentos,
  tipoDoItem,
} from "./index";
import { dia, executar, executarTodas, r, saldoDe } from "./testes/apoio";

/**
 * Um teste por regra das seções 15 a 21 de docs/regras-contabeis.md (hamburgueria).
 * ICMS de 18% por dentro; PIS de 0,65% e COFINS de 3% sobre a receita sem o ICMS.
 */

type Compra = Extract<Operacao, { tipo: "compra" }>;
type Venda = Extract<Operacao, { tipo: "venda" }>;

const aPrazo = { tipo: "prazo", dias: 30 } as const;
const aVistaNoBanco = { tipo: "avista", meio: "bancos" } as const;

const item = (produto: string, quantidade: number, preco: string) => ({
  produto,
  quantidade,
  precoUnitarioCentavos: r(preco),
});

const compra = (itens: Compra["itens"], extras: Partial<Compra> = {}): Compra => ({
  tipo: "compra",
  itens,
  ipiAliquota: 0,
  freteCentavos: 0,
  condicao: aPrazo,
  ...extras,
});

const venda = (itens: Venda["itens"], extras: Partial<Venda> = {}): Venda => ({
  tipo: "venda",
  itens,
  condicao: { tipo: "avista" },
  ...extras,
});

/** Hamburgueria com R$ 100.000,00 integralizados no banco. */
const hamburgueria = (): EstadoContabil =>
  executarTodas(criarEmpresa({ catalogo: CATALOGO_DA_HAMBURGUERIA }), [
    [{ tipo: "subscricao", valorCentavos: r("100.000,00") }, dia(1)],
    [{ tipo: "integralizacao", valorCentavos: r("100.000,00"), meio: "bancos" }, dia(1)],
  ]);

/** Custos médios: pão 0,82; carne 3,28; queijo 0,82; alface 0,41 (1.000 un. de cada). */
const comInsumos = (): EstadoContabil =>
  executar(
    hamburgueria(),
    compra([
      item("pao", 1000, "1,00"),
      item("carne", 1000, "4,00"),
      item("queijo", 1000, "1,00"),
      item("alface", 1000, "0,50"),
    ]),
    dia(2),
  ).estado;

/** 1.000 refrigerantes a R$ 3,00: custo médio de 2,46. */
const comRefrigerante = (): EstadoContabil =>
  executar(hamburgueria(), compra([item("refrigerante", 1000, "3,00")]), dia(2)).estado;

function erroDe(acao: () => unknown): ErroDeOperacao {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeOperacao) return erro;
    throw erro;
  }
  throw new Error("A operação deveria ter sido bloqueada.");
}

describe("15. itens de estoque e a receita do lanche", () => {
  it("R-INS-01: o catálogo tem insumos, mercadoria para revenda e material de consumo", () => {
    const tipo = (produto: string) => tipoDoItem(CATALOGO_DA_HAMBURGUERIA, produto);
    expect(["pao", "carne", "queijo", "alface"].map(tipo)).toEqual(Array(4).fill("insumo"));
    expect(tipo("refrigerante")).toBe("mercadoria");
    expect(tipo("material-de-limpeza")).toBe("consumo");
    expect(tipo("hamburguer-congelado")).toBe("produto_acabado");
    // Item fora do catálogo é mercadoria para revenda.
    expect(tipo("qualquer-coisa")).toBe("mercadoria");
  });

  it("R-INS-02: a compra de insumo vai a Estoque de Insumos, com crédito de ICMS", () => {
    const { linhas, estado } = executar(
      hamburgueria(),
      compra([item("carne", 1000, "4,00")]),
      dia(2),
    );
    expect(linhas).toEqual([
      ["Estoque de Insumos", "D", "3.280,00"],
      ["ICMS a Recuperar", "D", "720,00"],
      ["Fornecedores", "C", "4.000,00"],
    ]);
    expect(saldoDe(estado, "Estoque de Mercadorias")).toBe("0,00");
    expect(estado.estoque.carne).toEqual({ quantidade: 1000, valorCentavos: r("3.280,00") });
  });

  it("R-INS-03: cada hambúrguer vendido baixa os insumos da receita pelo custo médio", () => {
    const { linhas, estado } = executar(
      comInsumos(),
      venda([item("hamburguer", 100, "20,00")]),
      dia(3),
    );
    expect(linhas).toEqual([
      ["Caixa", "D", "2.000,00"],
      ["Receita Bruta de Vendas", "C", "2.000,00"],
      ["ICMS sobre Vendas", "D", "360,00"],
      ["ICMS a Recolher", "C", "360,00"],
      ["PIS sobre Faturamento", "D", "10,66"],
      ["PIS a Recolher", "C", "10,66"],
      ["COFINS sobre Faturamento", "D", "49,20"],
      ["COFINS a Recolher", "C", "49,20"],
      // 100 × (0,82 + 3,28 + 0,82 + 0,41)
      ["Custo dos Produtos Vendidos (CPV)", "D", "533,00"],
      ["Estoque de Insumos", "C", "533,00"],
    ]);
    for (const insumo of ["pao", "carne", "queijo", "alface"]) {
      expect(estado.estoque[insumo]?.quantidade, insumo).toBe(900);
    }
    expect(estado.estoque.hamburguer).toBeUndefined();
    expect(NOTAS_DIDATICAS["R-INS-03"]).toMatch(/receita fixa/);
  });

  it("R-INS-04: a venda é bloqueada se faltar qualquer insumo da receita", () => {
    // Sobra carne, mas não há pão suficiente.
    const estado = executar(
      hamburgueria(),
      compra([
        item("pao", 10, "1,00"),
        item("carne", 100, "4,00"),
        item("queijo", 100, "1,00"),
        item("alface", 100, "0,50"),
      ]),
      dia(2),
    ).estado;
    const erro = erroDe(() =>
      preverLancamentos(estado, venda([item("hamburguer", 11, "20,00")]), dia(3)),
    );
    expect(erro.codigo).toBe("estoque_insuficiente");
    expect(erro.regra).toBe("R-INS-04");
    expect(erro.message).toMatch(/pao/);
  });
});

describe("16. nota com mais de um item", () => {
  it("R-NOT-01: os tributos são calculados e arredondados por linha", () => {
    // Cada linha de R$ 0,03 tem ICMS de 0,54 centavo, que arredonda para 1 centavo.
    const previsao = preverLancamentos(
      hamburgueria(),
      compra([item("pao", 1, "0,03"), item("queijo", 1, "0,03")]),
      dia(2),
    );
    // Sobre o total de R$ 0,06, o ICMS seria de 1 centavo; por linha, são 2.
    expect(previsao.valores.icms).toBe(2);
    expect(previsao.novoEstado.estoque.pao?.valorCentavos).toBe(2);
    expect(previsao.novoEstado.estoque.queijo?.valorCentavos).toBe(2);
  });

  it("R-NOT-02: o frete é rateado pelo valor dos produtos; a sobra vai à maior linha", () => {
    expect(ratear(10, [100, 100, 100])).toEqual([4, 3, 3]);
    expect(ratear(1000, [1000, 3000])).toEqual([250, 750]);
    expect(ratear(0, [1, 2])).toEqual([0, 0]);

    // Frete de R$ 100,00 entre pão (R$ 1.000,00) e carne (R$ 4.000,00): 20,00 e 80,00.
    const { estado, linhas } = executar(
      hamburgueria(),
      compra([item("pao", 1000, "1,00"), item("carne", 1000, "4,00")], {
        freteCentavos: r("100,00"),
      }),
      dia(2),
    );
    // Pão: 1.020,00 − ICMS 183,60. Carne: 4.080,00 − ICMS 734,40.
    expect(estado.estoque.pao?.valorCentavos).toBe(r("836,40"));
    expect(estado.estoque.carne?.valorCentavos).toBe(r("3.345,60"));
    expect(linhas.at(-1)).toEqual(["Fornecedores", "C", "5.100,00"]);
  });

  it("R-NOT-03: um lançamento só, com um débito por conta de estoque", () => {
    const { linhas, lancamentos } = executar(
      hamburgueria(),
      compra([
        item("pao", 1000, "1,00"),
        item("refrigerante", 1000, "3,00"),
        item("carne", 1000, "4,00"),
      ]),
      dia(2),
    );
    expect(lancamentos).toHaveLength(1);
    expect(linhas).toEqual([
      // Pão (820,00) e carne (3.280,00) somados na mesma conta.
      ["Estoque de Insumos", "D", "4.100,00"],
      ["Estoque de Mercadorias", "D", "2.460,00"],
      ["ICMS a Recuperar", "D", "1.440,00"],
      ["Fornecedores", "C", "8.000,00"],
    ]);
  });
});

describe("17. devoluções e abatimentos", () => {
  const comDuasCompras = (): EstadoContabil =>
    executarTodas(hamburgueria(), [
      [compra([item("carne", 1000, "4,00")], { nota: "c1" }), dia(2)],
      // A segunda compra muda o custo médio, mas não o custo da primeira nota.
      [compra([item("carne", 1000, "5,00")], { nota: "c2" }), dia(3)],
    ]);

  it("R-DVC-01: a devolução de compra sai pelo custo com que aquela compra entrou", () => {
    const antes = comDuasCompras();
    expect(antes.estoque.carne).toEqual({ quantidade: 2000, valorCentavos: r("7.380,00") });
    const { linhas, estado } = executar(
      antes,
      { tipo: "devolucao_compra", nota: "c1", itens: [{ produto: "carne", quantidade: 100 }] },
      dia(4),
    );
    expect(linhas).toEqual([
      ["Fornecedores", "D", "400,00"],
      ["Estoque de Insumos", "C", "328,00"],
      ["ICMS a Recuperar", "C", "72,00"],
    ]);
    // Pelo custo médio do dia sairiam R$ 369,00; pelo custo da nota, R$ 328,00.
    expect(estado.estoque.carne).toEqual({ quantidade: 1900, valorCentavos: r("7.052,00") });

    // Não dá para devolver mais do que a nota tem.
    const erro = erroDe(() =>
      preverLancamentos(
        estado,
        { tipo: "devolucao_compra", nota: "c1", itens: [{ produto: "carne", quantidade: 901 }] },
        dia(5),
      ),
    );
    expect(erro.codigo).toBe("nota_invalida");
    expect(erro.regra).toBe("R-DVC-01");
  });

  it("R-ABC-01: o abatimento sobre compras reduz o custo e a dívida, sem mudar a quantidade", () => {
    const { linhas, estado } = executar(
      comDuasCompras(),
      { tipo: "abatimento_compra", nota: "c1", produto: "carne", valorCentavos: r("200,00") },
      dia(4),
    );
    expect(linhas).toEqual([
      ["Fornecedores", "D", "200,00"],
      ["Estoque de Insumos", "C", "200,00"],
    ]);
    expect(estado.estoque.carne).toEqual({ quantidade: 2000, valorCentavos: r("7.180,00") });
    // 📘 O ICMS da nota não é ajustado.
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("1.620,00 D");
    expect(NOTAS_DIDATICAS["R-ABC-01"]).toMatch(/ICMS/);
  });

  const comVendaAPrazo = (): EstadoContabil =>
    executar(
      comRefrigerante(),
      venda([item("refrigerante", 200, "6,00")], { condicao: aPrazo, nota: "v1" }),
      dia(3),
    ).estado;

  it("R-DVV-01: a devolução de venda estorna receita, tributos e custo, e devolve ao estoque", () => {
    const antes = comVendaAPrazo();
    expect(antes.estoque.refrigerante).toEqual({ quantidade: 800, valorCentavos: r("1.968,00") });
    const { linhas, estado } = executar(
      antes,
      {
        tipo: "devolucao_venda",
        nota: "v1",
        itens: [{ produto: "refrigerante", quantidade: 50 }],
      },
      dia(4),
    );
    expect(linhas).toEqual([
      ["Devoluções de Vendas", "D", "300,00"],
      ["Clientes", "C", "300,00"],
      ["ICMS a Recolher", "D", "54,00"],
      ["ICMS sobre Vendas", "C", "54,00"],
      ["PIS a Recolher", "D", "1,60"],
      ["PIS sobre Faturamento", "C", "1,60"],
      ["COFINS a Recolher", "D", "7,38"],
      ["COFINS sobre Faturamento", "C", "7,38"],
      ["Estoque de Mercadorias", "D", "123,00"],
      ["Custo das Mercadorias Vendidas (CMV)", "C", "123,00"],
    ]);
    expect(estado.estoque.refrigerante).toEqual({
      quantidade: 850,
      valorCentavos: r("2.091,00"),
    });
    // Na DRE, a devolução é dedução da receita bruta.
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    expect(d.totalReceitaBrutaCentavos).toBe(r("1.200,00"));
    expect(d.deducoes.find((l) => l.nome === "Devoluções de Vendas")?.valorCentavos).toBe(
      r("300,00"),
    );
  });

  it("R-DVV-01: lanche preparado não é devolvido", () => {
    const estado = executar(
      comInsumos(),
      venda([item("hamburguer", 10, "20,00")], { nota: "v2" }),
      dia(3),
    ).estado;
    const erro = erroDe(() =>
      preverLancamentos(
        estado,
        { tipo: "devolucao_venda", nota: "v2", itens: [{ produto: "hamburguer", quantidade: 1 }] },
        dia(4),
      ),
    );
    expect(erro.codigo).toBe("caso_nao_coberto");
    expect(erro.regra).toBe("R-DVV-01");
  });

  it("R-ABV-01: o abatimento sobre vendas é dedução da receita, sem ajustar tributos nem estoque", () => {
    const antes = comVendaAPrazo();
    const { linhas, estado } = executar(
      antes,
      { tipo: "abatimento_venda", valorCentavos: r("100,00"), contrapartida: "clientes" },
      dia(4),
    );
    expect(linhas).toEqual([
      ["Abatimentos sobre Vendas", "D", "100,00"],
      ["Clientes", "C", "100,00"],
    ]);
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("216,00 C");
    expect(estado.estoque).toEqual(antes.estoque);
    expect(NOTAS_DIDATICAS["R-ABV-01"]).toMatch(/tributos/);
  });
});

describe("18. descontos", () => {
  it("R-DSC-01: o desconto comercial não é registrado; a compra entra pelo líquido", () => {
    const { linhas } = executar(
      hamburgueria(),
      compra([item("carne", 1000, "4,00")], { descontoComercial: 1000 }),
      dia(2),
    );
    expect(linhas).toEqual([
      ["Estoque de Insumos", "D", "2.952,00"],
      ["ICMS a Recuperar", "D", "648,00"],
      ["Fornecedores", "C", "3.600,00"],
    ]);
  });

  it("R-DSC-02: o desconto por pagar antes é receita financeira e não muda o estoque", () => {
    const comprado = executar(
      hamburgueria(),
      compra([item("carne", 1000, "4,00")], { descontoComercial: 1000 }),
      dia(2),
    ).estado;
    const { linhas, estado } = executar(
      comprado,
      {
        tipo: "pagamento",
        obrigacao: "fornecedores",
        valorCentavos: r("3.600,00"),
        meio: "bancos",
        descontoFinanceiroCentavos: r("72,00"),
      },
      dia(10),
    );
    expect(linhas).toEqual([
      ["Fornecedores", "D", "3.600,00"],
      ["Bancos Conta Movimento", "C", "3.528,00"],
      ["Descontos Financeiros Obtidos", "C", "72,00"],
    ]);
    expect(estado.estoque).toEqual(comprado.estoque);
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    expect(d.resultadoFinanceiroCentavos).toBe(r("72,00"));
    expect(d.resultadoCentavos).toBe(r("72,00"));
    expect(NOTAS_DIDATICAS["R-DSC-02"]).toMatch(/receita financeira/);
  });

  it("R-DSC-03: no desconto incondicional, a receita bruta fica cheia e os tributos incidem sobre o líquido", () => {
    const { linhas, estado } = executar(
      comRefrigerante(),
      venda([item("refrigerante", 200, "6,00")], {
        condicao: aPrazo,
        descontoIncondicional: 1000,
      }),
      dia(3),
    );
    expect(linhas).toEqual([
      ["Clientes", "D", "1.080,00"],
      ["Descontos Incondicionais Concedidos", "D", "120,00"],
      ["Receita Bruta de Vendas", "C", "1.200,00"],
      ["ICMS sobre Vendas", "D", "194,40"],
      ["ICMS a Recolher", "C", "194,40"],
      ["PIS sobre Faturamento", "D", "5,76"],
      ["PIS a Recolher", "C", "5,76"],
      ["COFINS sobre Faturamento", "D", "26,57"],
      ["COFINS a Recolher", "C", "26,57"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "492,00"],
      ["Estoque de Mercadorias", "C", "492,00"],
    ]);
    const d = dre(estado, { de: dia(1), ate: dia(30) });
    expect(d.totalReceitaBrutaCentavos).toBe(r("1.200,00"));
    expect(d.receitaLiquidaCentavos).toBe(r("853,27"));
  });

  it("R-DSC-04: o desconto por receber antes é despesa financeira", () => {
    const vendido = executar(
      comRefrigerante(),
      venda([item("refrigerante", 200, "6,00")], {
        condicao: aPrazo,
        descontoIncondicional: 1000,
      }),
      dia(3),
    ).estado;
    const { linhas, estado } = executar(
      vendido,
      {
        tipo: "recebimento",
        valorCentavos: r("1.080,00"),
        meio: "bancos",
        descontoFinanceiroCentavos: r("54,00"),
      },
      dia(10),
    );
    expect(linhas).toEqual([
      ["Bancos Conta Movimento", "D", "1.026,00"],
      ["Descontos Financeiros Concedidos", "D", "54,00"],
      ["Clientes", "C", "1.080,00"],
    ]);
    expect(dre(estado, { de: dia(1), ate: dia(30) }).resultadoFinanceiroCentavos).toBe(-r("54,00"));
    expect(NOTAS_DIDATICAS["R-DSC-04"]).toMatch(/despesa financeira/);
  });
});

describe("19. consignação", () => {
  const emConsignacao: Operacao = {
    tipo: "recebimento_consignacao",
    produto: "refrigerante",
    quantidade: 300,
    precoUnitarioCentavos: r("3,00"),
  };
  const comConsignado = (): EstadoContabil =>
    executar(hamburgueria(), emConsignacao, dia(2)).estado;

  it("R-CSG-01: a mercadoria recebida em consignação não é ativo e não gera lançamento", () => {
    const antes = hamburgueria();
    const { lancamentos, estado } = executar(antes, emConsignacao, dia(2));
    expect(lancamentos).toEqual([]);
    expect(estado.lancamentos).toEqual(antes.lancamentos);
    expect(estado.estoque).toEqual({});
    expect(estado.consignado.refrigerante).toEqual({
      quantidade: 300,
      precoUnitarioCentavos: r("3,00"),
    });
    expect(balanco(estado, dia(2)).ativo.totalCentavos).toBe(r("100.000,00"));
  });

  it("R-CSG-02: na venda do item consignado, a compra e a venda são registradas juntas", () => {
    const { linhas, estado } = executar(
      comConsignado(),
      {
        tipo: "venda_consignada",
        produto: "refrigerante",
        quantidade: 100,
        precoUnitarioCentavos: r("6,00"),
        condicao: { tipo: "avista" },
      },
      dia(3),
    );
    expect(linhas).toEqual([
      ["Estoque de Mercadorias", "D", "246,00"],
      ["ICMS a Recuperar", "D", "54,00"],
      ["Fornecedores", "C", "300,00"],
      ["Caixa", "D", "600,00"],
      ["Receita Bruta de Vendas", "C", "600,00"],
      ["ICMS sobre Vendas", "D", "108,00"],
      ["ICMS a Recolher", "C", "108,00"],
      ["PIS sobre Faturamento", "D", "3,20"],
      ["PIS a Recolher", "C", "3,20"],
      ["COFINS sobre Faturamento", "D", "14,76"],
      ["COFINS a Recolher", "C", "14,76"],
      ["Custo das Mercadorias Vendidas (CMV)", "D", "246,00"],
      ["Estoque de Mercadorias", "C", "246,00"],
    ]);
    expect(estado.consignado.refrigerante?.quantidade).toBe(200);
    expect(estado.estoque.refrigerante).toEqual({ quantidade: 0, valorCentavos: 0 });

    // Não dá para vender mais do que há em consignação.
    const erro = erroDe(() =>
      preverLancamentos(
        estado,
        {
          tipo: "venda_consignada",
          produto: "refrigerante",
          quantidade: 201,
          precoUnitarioCentavos: r("6,00"),
          condicao: { tipo: "avista" },
        },
        dia(4),
      ),
    );
    expect(erro.regra).toBe("R-CSG-02");
  });

  it("R-CSG-03: devolver ao consignante o que não vendeu não gera lançamento", () => {
    const { lancamentos, estado } = executar(
      comConsignado(),
      { tipo: "devolucao_consignacao", produto: "refrigerante", quantidade: 300 },
      dia(3),
    );
    expect(lancamentos).toEqual([]);
    expect(estado.consignado.refrigerante?.quantidade).toBe(0);
  });

  it("R-CSG-04: o ICMS só aparece na compra efetiva e na venda, não na remessa", () => {
    expect(saldoDe(comConsignado(), "ICMS a Recuperar")).toBe("0,00");
    expect(NOTAS_DIDATICAS["R-CSG-04"]).toMatch(/remessa em consignação/);
  });
});

describe("20. material de consumo", () => {
  const comMaterial = (): EstadoContabil =>
    executar(
      hamburgueria(),
      compra([item("material-de-limpeza", 10, "50,00")], { condicao: aVistaNoBanco }),
      dia(2),
    ).estado;

  it("R-MCO-01: material de consumo entra pelo total da nota, sem crédito de ICMS", () => {
    const { linhas } = executar(
      hamburgueria(),
      compra([item("material-de-limpeza", 10, "50,00")], { condicao: aVistaNoBanco }),
      dia(2),
    );
    expect(linhas).toEqual([
      ["Material de Consumo", "D", "500,00"],
      ["Bancos Conta Movimento", "C", "500,00"],
    ]);
  });

  it("R-MCO-02: no inventário, o que saiu do estoque vira despesa do mês", () => {
    const { linhas, estado } = executar(
      comMaterial(),
      { tipo: "inventario_consumo", produto: "material-de-limpeza", quantidadeRestante: 4 },
      dia(30),
    );
    expect(linhas).toEqual([
      ["Despesa com Material de Consumo", "D", "300,00"],
      ["Material de Consumo", "C", "300,00"],
    ]);
    expect(estado.estoque["material-de-limpeza"]).toEqual({
      quantidade: 4,
      valorCentavos: r("200,00"),
    });
    // Nada foi usado: não há lançamento.
    const semUso = executar(
      comMaterial(),
      { tipo: "inventario_consumo", produto: "material-de-limpeza", quantidadeRestante: 10 },
      dia(30),
    );
    expect(semUso.lancamentos).toEqual([]);
  });
});

describe("21. IPI na fábrica e produção", () => {
  /** Carne a 3,28 e embalagem a 0,82 (com IPI recuperável de 5%). */
  const comFabrica = (): EstadoContabil =>
    executarTodas(hamburgueria(), [
      [compra([item("carne", 1000, "4,00")]), dia(2)],
      [
        compra([item("embalagem", 1000, "1,00")], { ipiAliquota: 500, ipiRecuperavel: true }),
        dia(2),
      ],
    ]);
  const comCongelados = (): EstadoContabil =>
    executar(
      comFabrica(),
      { tipo: "producao", produto: "hamburguer-congelado", quantidade: 100 },
      dia(3),
    ).estado;
  const vendaDeCongelados = venda([item("hamburguer-congelado", 100, "20,00")], {
    condicao: aPrazo,
    ipiAliquota: 500,
  });

  it("R-IPI-03: a venda de lanche preparado não tem IPI", () => {
    const erro = erroDe(() =>
      preverLancamentos(
        comInsumos(),
        venda([item("hamburguer", 10, "20,00")], { ipiAliquota: 500 }),
        dia(3),
      ),
    );
    expect(erro.regra).toBe("R-IPI-03");
  });

  it("R-IPI-04: na compra para a fábrica, o IPI é recuperável", () => {
    const { linhas } = executar(
      hamburgueria(),
      compra([item("embalagem", 1000, "1,00")], { ipiAliquota: 500, ipiRecuperavel: true }),
      dia(2),
    );
    expect(linhas).toEqual([
      ["Estoque de Insumos", "D", "820,00"],
      ["ICMS a Recuperar", "D", "180,00"],
      ["IPI a Recuperar", "D", "50,00"],
      ["Fornecedores", "C", "1.050,00"],
    ]);
  });

  it("R-IPI-05: na venda do congelado, o IPI é cobrado por fora e não é receita", () => {
    const { linhas } = executar(comCongelados(), vendaDeCongelados, dia(4));
    expect(linhas).toEqual([
      ["Clientes", "D", "2.100,00"],
      ["Receita Bruta de Vendas", "C", "2.000,00"],
      ["IPI a Recolher", "C", "100,00"],
      // ICMS, PIS e COFINS incidem sobre o valor dos produtos.
      ["ICMS sobre Vendas", "D", "360,00"],
      ["ICMS a Recolher", "C", "360,00"],
      ["PIS sobre Faturamento", "D", "10,66"],
      ["PIS a Recolher", "C", "10,66"],
      ["COFINS sobre Faturamento", "D", "49,20"],
      ["COFINS a Recolher", "C", "49,20"],
      ["Custo dos Produtos Vendidos (CPV)", "D", "410,00"],
      ["Produtos Acabados", "C", "410,00"],
    ]);
  });

  it("R-IPI-06: a apuração compensa o IPI a recolher com o IPI a recuperar; o saldo é pago", () => {
    const vendido = executar(comCongelados(), vendaDeCongelados, dia(4)).estado;
    const apuracao = executar(vendido, apurarIpi(vendido, { ano: 1, mes: 1 }), dia(30));
    expect(apuracao.linhas).toEqual([
      ["IPI a Recolher", "D", "50,00"],
      ["IPI a Recuperar", "C", "50,00"],
    ]);
    expect(saldoDe(apuracao.estado, "IPI a Recolher")).toBe("50,00 C");
    const pagamento = executar(
      apuracao.estado,
      { tipo: "pagamento", obrigacao: "ipi", valorCentavos: r("50,00"), meio: "bancos" },
      dia(30),
    );
    expect(pagamento.linhas).toEqual([
      ["IPI a Recolher", "D", "50,00"],
      ["Bancos Conta Movimento", "C", "50,00"],
    ]);
  });

  it("R-IPI-07: a alíquota do IPI vem na operação", () => {
    const previsao = preverLancamentos(
      comCongelados(),
      { ...vendaDeCongelados, ipiAliquota: 1000 },
      dia(4),
    );
    expect(previsao.valores.ipi).toBe(r("200,00"));
    expect(NOTAS_DIDATICAS["R-IPI-07"]).toMatch(/didáticas/);
  });

  it("R-PRD-01: produzir transfere o custo dos insumos para Produtos Acabados", () => {
    const { linhas, estado } = executar(
      comFabrica(),
      { tipo: "producao", produto: "hamburguer-congelado", quantidade: 100 },
      dia(3),
    );
    expect(linhas).toEqual([
      // 100 × (3,28 de carne + 0,82 de embalagem)
      ["Produtos Acabados", "D", "410,00"],
      ["Estoque de Insumos", "C", "410,00"],
    ]);
    expect(estado.estoque["hamburguer-congelado"]).toEqual({
      quantidade: 100,
      valorCentavos: r("410,00"),
    });
    expect(estado.estoque.carne?.quantidade).toBe(900);
    expect(estado.estoque.embalagem?.quantidade).toBe(900);
    expect(NOTAS_DIDATICAS["R-PRD-01"]).toMatch(/insumos da receita/);
  });
});
