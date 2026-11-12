import { describe, expect, it } from "vitest";
import { aplicarAliquota, multiplicarEDividir } from "./dinheiro";
import {
  apurarIcms,
  balancete,
  balanco,
  criarEmpresa,
  depreciarMes,
  dre,
  ErroDeOperacao,
  type EstadoContabil,
  NOTAS_DIDATICAS,
  type Operacao,
  PARAMETROS_PADRAO,
  PLANO_DE_CONTAS_V1,
  preverLancamentos,
} from "./index";
import {
  compraDeMercadorias,
  dia,
  executar,
  executarTodas,
  r,
  reais,
  saldoDe,
  vendaDeMercadorias,
} from "./testes/apoio";

/** Um teste por regra de docs/regras-contabeis.md, com o ID no nome do teste. */

const capital = (
  valor: string,
  meio: "caixa" | "bancos" = "bancos",
): [Operacao, ReturnType<typeof dia>][] => [
  [{ tipo: "subscricao", valorCentavos: r(valor) }, dia(1)],
  [{ tipo: "integralizacao", valorCentavos: r(valor), meio }, dia(1)],
];

/** Empresa com R$ 100.000,00 integralizados no banco. */
const empresaComBanco = (): EstadoContabil => executarTodas(criarEmpresa(), capital("100.000,00"));

/** Empresa com banco e 100 un compradas a prazo por R$ 30,00 (custo 2.460,00). */
const empresaComEstoque = (): EstadoContabil =>
  executar(
    empresaComBanco(),
    compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }),
    dia(2),
  ).estado;

function erroDe(acao: () => unknown): ErroDeOperacao {
  try {
    acao();
  } catch (erro) {
    if (erro instanceof ErroDeOperacao) return erro;
    throw erro;
  }
  throw new Error("A operação deveria ter sido bloqueada.");
}

describe("1. premissas gerais", () => {
  it("R-GER-01: todo lançamento do motor tem débitos = créditos", () => {
    const estado = executar(
      empresaComEstoque(),
      vendaDeMercadorias(7, "49,99", { tipo: "avista" }),
      dia(3),
    ).estado;
    for (const lancamento of estado.lancamentos) {
      const soma = (lado: "D" | "C") =>
        lancamento.partidas.reduce((s, p) => (p.lado === lado ? s + p.valorCentavos : s), 0);
      expect(soma("D")).toBe(soma("C"));
    }
  });

  it("R-GER-02: arredonda meio para cima, em centavos, por linha", () => {
    expect(aplicarAliquota(r("410,00"), 65)).toBe(267); // 2,665 → 2,67
    expect(aplicarAliquota(r("1.230,00"), 65)).toBe(800); // 7,995 → 8,00
    expect(aplicarAliquota(r("0,76"), 65)).toBe(0); // 0,00494 → 0,00
    expect(aplicarAliquota(r("0,77"), 65)).toBe(1); // 0,005005 → 0,01
    expect(multiplicarEDividir(1, 1, 2)).toBe(1); // 0,5 → 1
    expect(multiplicarEDividir(r("5.000,00"), 1, 60)).toBe(8333); // depreciação: 83,333… → 83,33
    // Valores grandes não perdem centavos (sem ponto flutuante).
    expect(multiplicarEDividir(9_000_000_000_000, 999_983, 999_983)).toBe(9_000_000_000_000);
  });

  it("R-GER-02: valores não inteiros são recusados", () => {
    const erro = erroDe(() =>
      preverLancamentos(criarEmpresa(), { tipo: "subscricao", valorCentavos: 100.5 }, dia(1)),
    );
    expect(erro.codigo).toBe("valor_invalido");
  });

  it("R-GER-03: a venda a prazo é receita do mês da venda, não do recebimento", () => {
    let estado = empresaComEstoque();
    estado = executar(
      estado,
      vendaDeMercadorias(10, "50,00", { tipo: "prazo", dias: 30 }),
      dia(5),
    ).estado;
    estado = executar(
      estado,
      { tipo: "recebimento", valorCentavos: r("500,00"), meio: "bancos" },
      dia(5, 2),
    ).estado;
    expect(reais(dre(estado, { de: dia(1), ate: dia(31) }).totalReceitaBrutaCentavos)).toBe(
      "500,00",
    );
    expect(reais(dre(estado, { de: dia(1, 2), ate: dia(28, 2) }).totalReceitaBrutaCentavos)).toBe(
      "0,00",
    );
  });

  it("R-GER-04: um único estabelecimento, com uma só alíquota interna de ICMS", () => {
    expect(Object.keys(PARAMETROS_PADRAO).filter((chave) => chave.startsWith("icms"))).toEqual([
      "icmsAliquota",
    ]);
  });
});

describe("2. entidade", () => {
  it("R-ENT-01: a carteira pessoal não é conta do plano nem parte do estado contábil", () => {
    expect(PLANO_DE_CONTAS_V1.contas.some((c) => /carteira|pessoal/i.test(c.nome))).toBe(false);
    expect(Object.keys(criarEmpresa()).sort()).toEqual([
      "catalogo",
      "consignado",
      "estoque",
      "imobilizado",
      "lancamentos",
      "notas",
      "parametros",
      "planoDeContas",
      "versaoSchema",
    ]);
  });

  it("R-ENT-02: a empresa registra a integralização; a carteira fica fora do razão", () => {
    const estado = executar(
      criarEmpresa(),
      { tipo: "subscricao", valorCentavos: r("300.000,00") },
      dia(1),
    ).estado;
    const { linhas } = executar(
      estado,
      { tipo: "integralizacao", valorCentavos: r("200.000,00"), meio: "bancos" },
      dia(1),
    );
    expect(linhas).toEqual([
      ["Bancos Conta Movimento", "D", "200.000,00"],
      ["(−) Capital a Integralizar", "C", "200.000,00"],
    ]);
  });
});

describe("3. capital social", () => {
  it("R-CAP-02: capital autorizado não gera lançamento (não existe operação para ele)", () => {
    const tipos: Operacao["tipo"][] = [
      "subscricao",
      "integralizacao",
      "deposito",
      "compra_imobilizado",
      "compra",
      "venda",
      "recebimento",
      "pagamento",
      "provisao_salarios",
      "despesa",
      "depreciacao",
      "apuracao_icms",
      "encerramento",
    ];
    expect(tipos.some((tipo) => tipo.includes("autoriza"))).toBe(false);
    expect(criarEmpresa().lancamentos).toEqual([]);
  });

  it("R-CAP-03: subscrição e integralização", () => {
    const subscricao = executar(
      criarEmpresa(),
      { tipo: "subscricao", valorCentavos: r("300.000,00") },
      dia(1),
    );
    expect(subscricao.linhas).toEqual([
      ["(−) Capital a Integralizar", "D", "300.000,00"],
      ["Capital Social Subscrito", "C", "300.000,00"],
    ]);
    const emCaixa = executar(
      subscricao.estado,
      { tipo: "integralizacao", valorCentavos: r("1.000,00"), meio: "caixa" },
      dia(1),
    );
    expect(emCaixa.linhas).toEqual([
      ["Caixa", "D", "1.000,00"],
      ["(−) Capital a Integralizar", "C", "1.000,00"],
    ]);
  });

  it("R-CAP-03: integralizar mais que o capital a integralizar é bloqueado", () => {
    const estado = executar(
      criarEmpresa(),
      { tipo: "subscricao", valorCentavos: r("100,00") },
      dia(1),
    ).estado;
    const erro = erroDe(() =>
      preverLancamentos(
        estado,
        { tipo: "integralizacao", valorCentavos: r("100,01"), meio: "bancos" },
        dia(1),
      ),
    );
    expect(erro.codigo).toBe("excede_saldo");
    expect(erro.regra).toBe("R-CAP-03");
  });

  it("R-CAP-04: o Balanço apresenta o capital subscrito menos o capital a integralizar", () => {
    let estado = executar(
      criarEmpresa(),
      { tipo: "subscricao", valorCentavos: r("300.000,00") },
      dia(1),
    ).estado;
    estado = executar(
      estado,
      { tipo: "integralizacao", valorCentavos: r("200.000,00"), meio: "bancos" },
      dia(1),
    ).estado;
    const pl = balanco(estado, dia(1)).patrimonioLiquido;
    expect(pl.contas.map((l) => [l.nome, reais(l.valorCentavos)])).toEqual([
      ["Capital Social Subscrito", "300.000,00"],
      ["(−) Capital a Integralizar", "-100.000,00"],
      ["Lucros ou Prejuízos Acumulados", "0,00"],
    ]);
    expect(reais(pl.capitalSocialCentavos)).toBe("200.000,00");
    expect(reais(pl.totalCentavos)).toBe("200.000,00");
  });

  it("R-CAP-05: o motor registra a integralização total, sem separar acionistas", () => {
    const estado = executar(
      criarEmpresa(),
      { tipo: "subscricao", valorCentavos: r("300.000,00") },
      dia(1),
    ).estado;
    const { lancamentos } = executar(
      estado,
      { tipo: "integralizacao", valorCentavos: r("200.000,00"), meio: "bancos" },
      dia(1),
    );
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]?.partidas).toHaveLength(2);
    expect(lancamentos[0]?.regras).toContain("R-CAP-05");
  });
});

describe("5. classificação de ativos e imóveis", () => {
  const imovel: Operacao = {
    tipo: "compra_imobilizado",
    itens: [
      { classe: "terrenos", valorCentavos: r("60.000,00") },
      { classe: "edificacoes", valorCentavos: r("30.000,00") },
    ],
    meio: "bancos",
  };

  it("R-IMO-02: imóvel usado pela própria empresa vai para o Imobilizado, não para o Estoque", () => {
    const estado = executar(empresaComBanco(), imovel, dia(2)).estado;
    const bp = balanco(estado, dia(2));
    expect(reais(bp.ativo.totalNaoCirculanteCentavos)).toBe("90.000,00");
    expect(saldoDe(estado, "Estoque de Mercadorias")).toBe("0,00");
    expect(estado.estoque).toEqual({});
  });

  it("R-IMO-04: terreno e edificação em contas separadas; o terreno não deprecia", () => {
    let estado = executar(empresaComBanco(), imovel, dia(2)).estado;
    expect(saldoDe(estado, "Terrenos")).toBe("60.000,00 D");
    expect(saldoDe(estado, "Edificações")).toBe("30.000,00 D");
    const depreciacao = executar(estado, depreciarMes(estado, { ano: 1, mes: 1 }), dia(30));
    estado = depreciacao.estado;
    expect(depreciacao.linhas).toEqual([
      ["Despesa de Depreciação", "D", "100,00"],
      ["(−) Depreciação Acumulada — Edificações", "C", "100,00"],
    ]);
    expect(balanco(estado, dia(30)).ativo.imobilizado[0]).toMatchObject({
      nome: "Terrenos",
      depreciacaoAcumuladaCentavos: 0,
      valorCentavos: r("60.000,00"),
    });
  });

  it("R-IMO-05: móveis, utensílios e equipamentos de uso próprio vão para o Imobilizado", () => {
    const { linhas } = executar(
      empresaComBanco(),
      {
        tipo: "compra_imobilizado",
        itens: [
          { classe: "moveis_utensilios", valorCentavos: r("15.000,00") },
          { classe: "equipamentos", valorCentavos: r("5.000,00") },
        ],
        meio: "bancos",
      },
      dia(2),
    );
    expect(linhas).toEqual([
      ["Móveis e Utensílios", "D", "15.000,00"],
      ["Equipamentos", "D", "5.000,00"],
      ["Bancos Conta Movimento", "C", "20.000,00"],
    ]);
  });

  it("R-IMO-06: a compra de imobilizado não destaca ICMS (nota didática)", () => {
    const { linhas, lancamentos } = executar(empresaComBanco(), imovel, dia(2));
    expect(linhas.some(([conta]) => conta.includes("ICMS"))).toBe(false);
    expect(lancamentos[0]?.regras).toContain("R-IMO-06");
    expect(NOTAS_DIDATICAS["R-IMO-06"]).toMatch(/ICMS/);
  });
});

describe("6. estoque", () => {
  it("R-EST-01: inventário permanente, atualizado a cada entrada e saída", () => {
    let estado = empresaComEstoque();
    expect(estado.estoque["mercadorias-diversas"]).toEqual({
      quantidade: 100,
      valorCentavos: r("2.460,00"),
    });
    estado = executar(estado, vendaDeMercadorias(40, "50,00", { tipo: "avista" }), dia(3)).estado;
    expect(estado.estoque["mercadorias-diversas"]).toEqual({
      quantidade: 60,
      valorCentavos: r("1.476,00"),
    });
  });

  it("R-EST-02: custo médio ponderado móvel, por produto, guardando valor e quantidade", () => {
    let estado = empresaComEstoque(); // 100 un, 2.460,00
    estado = executar(
      estado,
      compraDeMercadorias(
        50,
        "30,00",
        { tipo: "avista", meio: "bancos" },
        { ipiAliquota: 1000, frete: "50,00" },
      ),
      dia(3),
    ).estado;
    // 150 un, 3.881,00 → custo médio ≈ 25,8733 (derivado, nunca guardado arredondado).
    expect(estado.estoque["mercadorias-diversas"]).toEqual({
      quantidade: 150,
      valorCentavos: r("3.881,00"),
    });
    estado = executar(
      estado,
      compraDeMercadorias(10, "8,00", { tipo: "avista", meio: "bancos" }, { produto: "feijao" }),
      dia(3),
    ).estado;
    expect(estado.estoque.feijao).toEqual({ quantidade: 10, valorCentavos: r("65,60") });
    expect(estado.estoque["mercadorias-diversas"]?.quantidade).toBe(150);
  });

  it("R-EST-03: CMV arredondado por saída; a saída que zera o estoque leva o valor restante", () => {
    // 3 un por 10,00 no total: custo médio 3,3333…
    let estado = executar(
      criarEmpresa({ parametros: { ...PARAMETROS_PADRAO, icmsAliquota: 0 } }),
      { tipo: "subscricao", valorCentavos: r("100,00") },
      dia(1),
    ).estado;
    estado = executar(
      estado,
      { tipo: "integralizacao", valorCentavos: r("100,00"), meio: "caixa" },
      dia(1),
    ).estado;
    // 3 un a 3,33 + frete de 0,01 = 10,00 em estoque.
    estado = executar(
      estado,
      compraDeMercadorias(3, "3,33", { tipo: "avista", meio: "caixa" }, { frete: "0,01" }),
      dia(3),
    ).estado;
    expect(estado.estoque["mercadorias-diversas"]).toEqual({ quantidade: 3, valorCentavos: 1000 });

    const cmvs: number[] = [];
    for (const d of [4, 5, 6]) {
      const previsao = preverLancamentos(
        estado,
        vendaDeMercadorias(1, "20,00", { tipo: "avista" }),
        dia(d),
      );
      cmvs.push(previsao.valores.cmv ?? -1);
      estado = executar(estado, vendaDeMercadorias(1, "20,00", { tipo: "avista" }), dia(d)).estado;
    }
    // round(1000×1/3)=333; round(667×1/2)=334 (333,5 → 334); a última leva o resto: 333.
    expect(cmvs).toEqual([333, 334, 333]);
    expect(estado.estoque["mercadorias-diversas"]).toEqual({ quantidade: 0, valorCentavos: 0 });
  });

  it("R-EST-04: venda acima da quantidade em estoque é bloqueada", () => {
    const estado = empresaComEstoque();
    const erro = erroDe(() =>
      preverLancamentos(estado, vendaDeMercadorias(101, "50,00", { tipo: "avista" }), dia(3)),
    );
    expect(erro.codigo).toBe("estoque_insuficiente");
    expect(erro.regra).toBe("R-EST-04");
    // Vender exatamente o que há é permitido.
    expect(() =>
      preverLancamentos(estado, vendaDeMercadorias(100, "50,00", { tipo: "avista" }), dia(3)),
    ).not.toThrow();
  });
});

describe("7. compras de mercadorias", () => {
  const compraCompleta = compraDeMercadorias(
    50,
    "30,00",
    { tipo: "avista", meio: "bancos" },
    { ipiAliquota: 1000, frete: "50,00" },
  );

  it("R-COM-01: custo de aquisição = produtos + IPI + frete − ICMS recuperável", () => {
    const { valores } = preverLancamentos(empresaComBanco(), compraCompleta, dia(2));
    expect(valores).toEqual({
      totalNota: r("1.700,00"),
      ipi: r("150,00"),
      icms: r("279,00"),
      custoEstoque: r("1.421,00"),
    });
  });

  it("R-COM-02: à vista credita Caixa ou Bancos; a prazo credita Fornecedores pelo total da nota", () => {
    const base = executarTodas(criarEmpresa(), [
      ...capital("100.000,00"),
      [{ tipo: "subscricao", valorCentavos: r("5.000,00") }, dia(1)],
      [{ tipo: "integralizacao", valorCentavos: r("5.000,00"), meio: "caixa" }, dia(1)],
    ]);
    const credito = (condicao: Parameters<typeof compraDeMercadorias>[2]) =>
      executar(base, compraDeMercadorias(100, "30,00", condicao), dia(2)).linhas.at(-1);
    expect(credito({ tipo: "avista", meio: "caixa" })).toEqual(["Caixa", "C", "3.000,00"]);
    expect(credito({ tipo: "avista", meio: "bancos" })).toEqual([
      "Bancos Conta Movimento",
      "C",
      "3.000,00",
    ]);
    expect(credito({ tipo: "prazo", dias: 30 })).toEqual(["Fornecedores", "C", "3.000,00"]);
  });

  it("R-COM-03: D Estoque (custo) / D ICMS a Recuperar / C contrapartida (total da nota)", () => {
    const { linhas } = executar(
      empresaComBanco(),
      compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }),
      dia(2),
    );
    expect(linhas).toEqual([
      ["Estoque de Mercadorias", "D", "2.460,00"],
      ["ICMS a Recuperar", "D", "540,00"],
      ["Fornecedores", "C", "3.000,00"],
    ]);
  });

  it("R-COM-04: compra de mercadoria não é despesa; o custo só vai ao resultado na venda", () => {
    let estado = empresaComEstoque();
    expect(dre(estado, { de: dia(1), ate: dia(31) }).resultadoCentavos).toBe(0);
    estado = executar(estado, vendaDeMercadorias(10, "50,00", { tipo: "avista" }), dia(3)).estado;
    expect(reais(dre(estado, { de: dia(1), ate: dia(31) }).totalCustosCentavos)).toBe("246,00");
  });
});

describe("8. tributos", () => {
  it("R-ICMS-01: alíquota interna configurável, com padrão de 18%", () => {
    expect(PARAMETROS_PADRAO.icmsAliquota).toBe(1800);
    const estado = executarTodas(
      criarEmpresa({ parametros: { ...PARAMETROS_PADRAO, icmsAliquota: 1200 } }),
      capital("100.000,00"),
    );
    const { valores } = preverLancamentos(
      estado,
      compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }),
      dia(2),
    );
    expect(reais(valores.icms ?? 0)).toBe("360,00");
  });

  it("R-ICMS-02: ICMS por dentro, incluído no valor da operação", () => {
    const { valores } = preverLancamentos(
      empresaComBanco(),
      compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }),
      dia(2),
    );
    // A nota é de 3.000,00 e já contém os 540,00 de ICMS: o total não aumenta.
    expect(reais(valores.totalNota ?? 0)).toBe("3.000,00");
    expect(reais(valores.icms ?? 0)).toBe("540,00");
  });

  it("R-ICMS-03: base do ICMS na compra = produtos + frete, sem o IPI", () => {
    const comIpi = (ipiAliquota: number, frete: string) =>
      preverLancamentos(
        empresaComBanco(),
        compraDeMercadorias(
          50,
          "30,00",
          { tipo: "avista", meio: "bancos" },
          { ipiAliquota, frete },
        ),
        dia(2),
      ).valores.icms;
    expect(reais(comIpi(0, "50,00") ?? 0)).toBe("279,00"); // 18% de 1.550,00
    expect(comIpi(1000, "50,00")).toBe(comIpi(0, "50,00")); // o IPI não muda o ICMS
    expect(reais(comIpi(1000, "0,00") ?? 0)).toBe("270,00"); // 18% de 1.500,00
  });

  it("R-ICMS-04: o ICMS da compra para revenda é recuperável (D ICMS a Recuperar)", () => {
    const estado = empresaComEstoque();
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("540,00 D");
  });

  it("R-ICMS-05: na venda, D ICMS sobre Vendas / C ICMS a Recolher", () => {
    const { linhas } = executar(
      empresaComEstoque(),
      vendaDeMercadorias(10, "50,00", { tipo: "avista" }),
      dia(3),
    );
    expect(linhas.slice(2, 4)).toEqual([
      ["ICMS sobre Vendas", "D", "90,00"],
      ["ICMS a Recolher", "C", "90,00"],
    ]);
  });

  it("R-ICMS-06: apuração com saldo credor — compensa e o resto fica em ICMS a Recuperar", () => {
    let estado = empresaComEstoque(); // a recuperar 540,00
    estado = executar(estado, vendaDeMercadorias(10, "50,00", { tipo: "avista" }), dia(3)).estado;
    const apuracao = executar(estado, apurarIcms(estado, { ano: 1, mes: 1 }), dia(30));
    expect(apuracao.linhas).toEqual([
      ["ICMS a Recolher", "D", "90,00"],
      ["ICMS a Recuperar", "C", "90,00"],
    ]);
    expect(saldoDe(apuracao.estado, "ICMS a Recuperar")).toBe("450,00 D");
    expect(saldoDe(apuracao.estado, "ICMS a Recolher")).toBe("0,00");
  });

  it("R-ICMS-06: apuração com saldo devedor — o saldo é pago no Posto Fiscal", () => {
    let estado = empresaComEstoque(); // a recuperar 540,00
    estado = executar(estado, vendaDeMercadorias(100, "50,00", { tipo: "avista" }), dia(3)).estado;
    estado = executar(estado, apurarIcms(estado, { ano: 1, mes: 1 }), dia(30)).estado;
    expect(saldoDe(estado, "ICMS a Recuperar")).toBe("0,00");
    expect(saldoDe(estado, "ICMS a Recolher")).toBe("360,00 C");

    const acima = erroDe(() =>
      preverLancamentos(
        estado,
        { tipo: "pagamento", obrigacao: "icms", valorCentavos: r("360,01"), meio: "caixa" },
        dia(30),
      ),
    );
    expect(acima.codigo).toBe("excede_saldo");

    const pagamento = executar(
      estado,
      { tipo: "pagamento", obrigacao: "icms", valorCentavos: r("360,00"), meio: "caixa" },
      dia(30),
    );
    expect(pagamento.linhas).toEqual([
      ["ICMS a Recolher", "D", "360,00"],
      ["Caixa", "C", "360,00"],
    ]);
  });

  it("R-ICMS-06: sem ICMS a compensar, a apuração não gera lançamento", () => {
    const estado = empresaComEstoque();
    expect(
      preverLancamentos(estado, apurarIcms(estado, { ano: 1, mes: 1 }), dia(30)).lancamentos,
    ).toEqual([]);
  });

  it("R-IPI-01: o comerciante não recupera o IPI; ele integra o custo", () => {
    const semIpi = preverLancamentos(
      empresaComBanco(),
      compraDeMercadorias(50, "30,00", { tipo: "avista", meio: "bancos" }),
      dia(2),
    ).valores;
    const comIpi = executar(
      empresaComBanco(),
      compraDeMercadorias(50, "30,00", { tipo: "avista", meio: "bancos" }, { ipiAliquota: 1000 }),
      dia(2),
    );
    const valores = preverLancamentos(
      empresaComBanco(),
      compraDeMercadorias(50, "30,00", { tipo: "avista", meio: "bancos" }, { ipiAliquota: 1000 }),
      dia(2),
    ).valores;
    expect((valores.custoEstoque ?? 0) - (semIpi.custoEstoque ?? 0)).toBe(r("150,00"));
    expect(comIpi.linhas.map(([conta]) => conta)).toEqual([
      "Estoque de Mercadorias",
      "ICMS a Recuperar",
      "Bancos Conta Movimento",
    ]);
  });

  it("R-IPI-02: a alíquota do IPI vem na operação (oferta do fornecedor), não dos parâmetros", () => {
    expect(Object.keys(PARAMETROS_PADRAO).some((chave) => /ipi/i.test(chave))).toBe(false);
    const ipi = (ipiAliquota: number) =>
      preverLancamentos(
        empresaComBanco(),
        compraDeMercadorias(50, "30,00", { tipo: "avista", meio: "bancos" }, { ipiAliquota }),
        dia(2),
      ).valores.ipi;
    expect(ipi(500)).toBe(r("75,00"));
    expect(ipi(1000)).toBe(r("150,00"));
  });

  it("R-FRE-01: o frete cobrado na nota integra o custo e a base do ICMS", () => {
    const valores = (frete: string) =>
      preverLancamentos(
        empresaComBanco(),
        compraDeMercadorias(50, "30,00", { tipo: "avista", meio: "bancos" }, { frete }),
        dia(2),
      ).valores;
    const sem = valores("0,00");
    const com = valores("50,00");
    expect((com.icms ?? 0) - (sem.icms ?? 0)).toBe(r("9,00")); // 18% do frete
    expect((com.custoEstoque ?? 0) - (sem.custoEstoque ?? 0)).toBe(r("41,00")); // frete − ICMS
  });

  it("R-PC-01: PIS 0,65% e COFINS 3,00% cumulativos, sem crédito nas compras", () => {
    expect(PARAMETROS_PADRAO.pisAliquota).toBe(65);
    expect(PARAMETROS_PADRAO.cofinsAliquota).toBe(300);
    const { linhas } = executar(
      empresaComBanco(),
      compraDeMercadorias(100, "30,00", { tipo: "prazo", dias: 30 }),
      dia(2),
    );
    expect(linhas.some(([conta]) => /PIS|COFINS/.test(conta))).toBe(false);
  });

  it("R-PC-02: base do PIS/COFINS = receita bruta − ICMS destacado", () => {
    const { valores } = preverLancamentos(
      empresaComEstoque(),
      vendaDeMercadorias(80, "50,00", { tipo: "avista" }),
      dia(3),
    );
    // Receita 4.000,00 − ICMS 720,00 = base 3.280,00.
    expect(reais(valores.pis ?? 0)).toBe("21,32");
    expect(reais(valores.cofins ?? 0)).toBe("98,40");
  });

  it("R-PC-03: na venda, PIS e COFINS sobre o faturamento contra PIS e COFINS a recolher", () => {
    const { linhas } = executar(
      empresaComEstoque(),
      vendaDeMercadorias(80, "50,00", { tipo: "avista" }),
      dia(3),
    );
    expect(linhas.slice(4, 8)).toEqual([
      ["PIS sobre Faturamento", "D", "21,32"],
      ["PIS a Recolher", "C", "21,32"],
      ["COFINS sobre Faturamento", "D", "98,40"],
      ["COFINS a Recolher", "C", "98,40"],
    ]);
  });

  it("R-PC-04: o pagamento de PIS/COFINS fica fora da v1", () => {
    const estado = executar(
      empresaComEstoque(),
      vendaDeMercadorias(80, "50,00", { tipo: "avista" }),
      dia(3),
    ).estado;
    const pagamento = {
      tipo: "pagamento",
      obrigacao: "pis",
      valorCentavos: r("21,32"),
      meio: "bancos",
    } as unknown as Operacao;
    const erro = erroDe(() => preverLancamentos(estado, pagamento, dia(4)));
    expect(erro.codigo).toBe("caso_nao_coberto");
    expect(erro.regra).toBe("R-PC-04");
  });
});

describe("9. vendas", () => {
  it("R-VEN-01: à vista debita Caixa; a prazo debita Clientes", () => {
    const debito = (condicao: Parameters<typeof vendaDeMercadorias>[2]) =>
      executar(empresaComEstoque(), vendaDeMercadorias(10, "50,00", condicao), dia(3)).linhas.slice(
        0,
        2,
      );
    expect(debito({ tipo: "avista" })).toEqual([
      ["Caixa", "D", "500,00"],
      ["Receita Bruta de Vendas", "C", "500,00"],
    ]);
    expect(debito({ tipo: "prazo", dias: 30 })).toEqual([
      ["Clientes", "D", "500,00"],
      ["Receita Bruta de Vendas", "C", "500,00"],
    ]);
  });

  it("R-VEN-02: toda venda gera receita, ICMS, PIS, COFINS e CMV", () => {
    const { lancamentos, linhas } = executar(
      empresaComEstoque(),
      vendaDeMercadorias(10, "50,00", { tipo: "avista" }),
      dia(3),
    );
    expect(lancamentos).toHaveLength(5);
    expect(linhas.slice(8)).toEqual([
      ["Custo das Mercadorias Vendidas (CMV)", "D", "246,00"],
      ["Estoque de Mercadorias", "C", "246,00"],
    ]);
  });

  it("R-VEN-03: recebimento de cliente em Caixa ou Bancos, limitado ao saldo de Clientes", () => {
    const estado = executar(
      empresaComEstoque(),
      vendaDeMercadorias(10, "50,00", { tipo: "prazo", dias: 30 }),
      dia(3),
    ).estado;
    expect(
      executar(estado, { tipo: "recebimento", valorCentavos: r("200,00"), meio: "bancos" }, dia(4))
        .linhas,
    ).toEqual([
      ["Bancos Conta Movimento", "D", "200,00"],
      ["Clientes", "C", "200,00"],
    ]);
    expect(
      executar(estado, { tipo: "recebimento", valorCentavos: r("500,00"), meio: "caixa" }, dia(4))
        .linhas[0],
    ).toEqual(["Caixa", "D", "500,00"]);
    const erro = erroDe(() =>
      preverLancamentos(
        estado,
        { tipo: "recebimento", valorCentavos: r("500,01"), meio: "caixa" },
        dia(4),
      ),
    );
    expect(erro.codigo).toBe("excede_saldo");
    expect(erro.regra).toBe("R-VEN-03");
  });
});

describe("10. despesas e obrigações", () => {
  const salarios: Operacao = { tipo: "provisao_salarios", valorCentavos: r("4.000,00") };

  it("R-DES-01: reconhecer a despesa e pagar a obrigação são eventos diferentes", () => {
    let estado = executar(empresaComBanco(), salarios, dia(28)).estado;
    // Despesa reconhecida em janeiro, sem saída de dinheiro.
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("100.000,00 D");
    expect(reais(dre(estado, { de: dia(1), ate: dia(31) }).resultadoCentavos)).toBe("-4.000,00");
    // Pagamento em fevereiro: sai dinheiro, sem nova despesa.
    estado = executar(
      estado,
      { tipo: "pagamento", obrigacao: "salarios", valorCentavos: r("4.000,00"), meio: "bancos" },
      dia(5, 2),
    ).estado;
    expect(saldoDe(estado, "Bancos Conta Movimento")).toBe("96.000,00 D");
    expect(dre(estado, { de: dia(1, 2), ate: dia(28, 2) }).resultadoCentavos).toBe(0);
  });

  it("R-DES-02: salários do mês e pagamento dos salários", () => {
    const provisao = executar(empresaComBanco(), salarios, dia(28));
    expect(provisao.linhas).toEqual([
      ["Despesas com Salários", "D", "4.000,00"],
      ["Salários a Pagar", "C", "4.000,00"],
    ]);
    const pagamento = executar(
      provisao.estado,
      { tipo: "pagamento", obrigacao: "salarios", valorCentavos: r("4.000,00"), meio: "bancos" },
      dia(28),
    );
    expect(pagamento.linhas).toEqual([
      ["Salários a Pagar", "D", "4.000,00"],
      ["Bancos Conta Movimento", "C", "4.000,00"],
    ]);
    expect(saldoDe(pagamento.estado, "Salários a Pagar")).toBe("0,00");
  });

  it("R-DES-03: a folha não gera encargos nem retenções (nota didática)", () => {
    const { lancamentos } = executar(empresaComBanco(), salarios, dia(28));
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0]?.partidas).toHaveLength(2);
    expect(NOTAS_DIDATICAS["R-DES-03"]).toMatch(/encargos/);
  });

  it("R-DES-04: despesa paga na hora — D Despesa / C Bancos ou Caixa", () => {
    const { linhas } = executar(
      empresaComBanco(),
      {
        tipo: "despesa",
        natureza: "energia_eletrica",
        valorCentavos: r("1.000,00"),
        meio: "bancos",
      },
      dia(28),
    );
    expect(linhas).toEqual([
      ["Despesa com Energia Elétrica", "D", "1.000,00"],
      ["Bancos Conta Movimento", "C", "1.000,00"],
    ]);
  });

  it("R-DES-05: pagamento a fornecedor, total ou parcial, limitado ao saldo devido", () => {
    const estado = empresaComEstoque(); // Fornecedores 3.000,00
    const parcial = executar(
      estado,
      {
        tipo: "pagamento",
        obrigacao: "fornecedores",
        valorCentavos: r("1.000,00"),
        meio: "bancos",
      },
      dia(10),
    );
    expect(parcial.linhas).toEqual([
      ["Fornecedores", "D", "1.000,00"],
      ["Bancos Conta Movimento", "C", "1.000,00"],
    ]);
    expect(saldoDe(parcial.estado, "Fornecedores")).toBe("2.000,00 C");
    const erro = erroDe(() =>
      preverLancamentos(
        parcial.estado,
        {
          tipo: "pagamento",
          obrigacao: "fornecedores",
          valorCentavos: r("2.000,01"),
          meio: "bancos",
        },
        dia(11),
      ),
    );
    expect(erro.codigo).toBe("excede_saldo");
    expect(erro.regra).toBe("R-DES-05");
  });
});

describe("11. depreciação", () => {
  const equipamento = (valor: string): Operacao => ({
    tipo: "compra_imobilizado",
    itens: [{ classe: "equipamentos", valorCentavos: r(valor) }],
    meio: "bancos",
  });

  it("R-DEP-01: linear sobre o custo, com vidas úteis de 25, 10 e 5 anos; terreno não deprecia", () => {
    expect(PARAMETROS_PADRAO.vidaUtilAnos).toEqual({
      edificacoes: 25,
      moveis_utensilios: 10,
      equipamentos: 5,
    });
    let estado = executar(
      empresaComBanco(),
      {
        tipo: "compra_imobilizado",
        itens: [
          { classe: "terrenos", valorCentavos: r("12.000,00") },
          { classe: "edificacoes", valorCentavos: r("30.000,00") },
          { classe: "moveis_utensilios", valorCentavos: r("12.000,00") },
          { classe: "equipamentos", valorCentavos: r("6.000,00") },
        ],
        meio: "bancos",
      },
      dia(2),
    ).estado;
    const meses = [1, 2].map((mes) => {
      const resultado = executar(estado, depreciarMes(estado, { ano: 1, mes }), dia(28, mes));
      estado = resultado.estado;
      return resultado.linhas.filter(([, lado]) => lado === "C").map(([, , valor]) => valor);
    });
    // Mesma quota todo mês (linear): 30.000/300, 12.000/120, 6.000/60.
    expect(meses).toEqual([
      ["100,00", "100,00", "100,00"],
      ["100,00", "100,00", "100,00"],
    ]);
    expect(saldoDe(estado, "Terrenos")).toBe("12.000,00 D");
  });

  it("R-DEP-02: valor residual zero — o bem deprecia até zerar e para (nota didática)", () => {
    const estado0 = executar(
      criarEmpresa({
        parametros: {
          ...PARAMETROS_PADRAO,
          vidaUtilAnos: { ...PARAMETROS_PADRAO.vidaUtilAnos, equipamentos: 1 },
        },
      }),
      { tipo: "subscricao", valorCentavos: r("1.000,00") },
      dia(1),
    ).estado;
    let estado = executar(
      estado0,
      { tipo: "integralizacao", valorCentavos: r("1.000,00"), meio: "bancos" },
      dia(1),
    ).estado;
    estado = executar(estado, equipamento("1.000,00"), dia(1)).estado;
    const quotas: string[] = [];
    for (let mes = 1; mes <= 13; mes++) {
      const data = mes <= 12 ? dia(28, mes) : dia(28, mes - 12, 2);
      const resultado = executar(estado, depreciarMes(estado, data), data);
      estado = resultado.estado;
      quotas.push(resultado.linhas[0]?.[2] ?? "sem lançamento");
    }
    // 1.000,00 ÷ 12 = 83,33 por mês; a quota nunca passa do que resta a depreciar,
    // então os 0,04 de resíduo do arredondamento saem no mês seguinte.
    expect(quotas).toEqual([...Array<string>(12).fill("83,33"), "0,04"]);
    expect(saldoDe(estado, "(−) Depreciação Acumulada — Equipamentos")).toBe("1.000,00 C");
    expect(balanco(estado, dia(28, 1, 2)).ativo.imobilizado.at(-1)?.valorCentavos).toBe(0);
    // Totalmente depreciado: não há mais lançamento.
    expect(
      preverLancamentos(estado, depreciarMes(estado, { ano: 2, mes: 2 }), dia(28, 2, 2))
        .lancamentos,
    ).toEqual([]);
    expect(NOTAS_DIDATICAS["R-DEP-02"]).toMatch(/residual/);
  });

  it("R-DEP-03: mês completo a partir do mês em que o bem entra em uso (nota didática)", () => {
    // Comprado no dia 25: deprecia o mês inteiro, sem pro rata.
    let estado = executar(empresaComBanco(), equipamento("6.000,00"), dia(25)).estado;
    const janeiro = executar(estado, depreciarMes(estado, { ano: 1, mes: 1 }), dia(30));
    expect(janeiro.linhas[0]).toEqual(["Despesa de Depreciação", "D", "100,00"]);
    // Bem comprado em fevereiro só entra na depreciação de fevereiro.
    estado = executar(janeiro.estado, equipamento("3.000,00"), dia(10, 2)).estado;
    const fevereiro = executar(estado, depreciarMes(estado, { ano: 1, mes: 2 }), dia(28, 2));
    expect(fevereiro.linhas[0]).toEqual(["Despesa de Depreciação", "D", "150,00"]);
    expect(NOTAS_DIDATICAS["R-DEP-03"]).toMatch(/mês completo/);
  });

  it("R-DEP-04: lançamento mensal por classe, round(custo ÷ vidaUtilAnos ÷ 12)", () => {
    const estado = executar(empresaComBanco(), equipamento("5.000,00"), dia(2)).estado;
    const { linhas, lancamentos } = executar(
      estado,
      depreciarMes(estado, { ano: 1, mes: 1 }),
      dia(30),
    );
    expect(linhas).toEqual([
      ["Despesa de Depreciação", "D", "83,33"],
      ["(−) Depreciação Acumulada — Equipamentos", "C", "83,33"],
    ]);
    expect(lancamentos[0]?.regras).toContain("R-DEP-04");
  });

  it("R-DEP-04: a depreciação do mesmo mês não pode ser lançada duas vezes", () => {
    let estado = executar(empresaComBanco(), equipamento("5.000,00"), dia(2)).estado;
    estado = executar(estado, depreciarMes(estado, { ano: 1, mes: 1 }), dia(30)).estado;
    const erro = erroDe(() =>
      preverLancamentos(estado, depreciarMes(estado, { ano: 1, mes: 1 }), dia(30)),
    );
    expect(erro.codigo).toBe("operacao_repetida");
  });
});

describe("12. demonstrações", () => {
  const empresaComVenda = (): EstadoContabil =>
    executarTodas(empresaComEstoque(), [
      [vendaDeMercadorias(80, "50,00", { tipo: "avista" }), dia(3)],
      [{ tipo: "provisao_salarios", valorCentavos: r("500,00") }, dia(28)],
    ]);

  it("R-DEM-01: no balancete, total devedor = total credor", () => {
    const b = balancete(empresaComVenda());
    expect(b.totalDevedorCentavos).toBe(b.totalCredorCentavos);
    expect(b.totalDevedorCentavos).toBeGreaterThan(0);
  });

  it("R-DEM-02: estrutura da DRE", () => {
    const d = dre(empresaComVenda(), { de: dia(1), ate: dia(31) });
    expect(reais(d.totalReceitaBrutaCentavos)).toBe("4.000,00");
    expect(reais(d.totalDeducoesCentavos)).toBe("839,72"); // 720,00 + 21,32 + 98,40
    expect(d.receitaLiquidaCentavos).toBe(d.totalReceitaBrutaCentavos - d.totalDeducoesCentavos);
    expect(reais(d.totalCustosCentavos)).toBe("1.968,00");
    expect(d.lucroBrutoCentavos).toBe(d.receitaLiquidaCentavos - d.totalCustosCentavos);
    expect(reais(d.totalDespesasOperacionaisCentavos)).toBe("500,00");
    expect(d.resultadoCentavos).toBe(d.lucroBrutoCentavos - d.totalDespesasOperacionaisCentavos);
    expect(reais(d.resultadoCentavos)).toBe("692,28");
  });

  it("R-DEM-03: o resultado não encerrado aparece no PL; ativo em circulante e não circulante", () => {
    const estado = executar(
      empresaComVenda(),
      {
        tipo: "compra_imobilizado",
        itens: [{ classe: "equipamentos", valorCentavos: r("6.000,00") }],
        meio: "bancos",
      },
      dia(28),
    ).estado;
    const depreciado = executar(estado, depreciarMes(estado, { ano: 1, mes: 1 }), dia(30)).estado;
    const bp = balanco(depreciado, dia(30));
    expect(reais(bp.patrimonioLiquido.resultadoDoPeriodoCentavos)).toBe("592,28");
    expect(bp.ativo.totalCentavos).toBe(bp.totalPassivoEPatrimonioLiquidoCentavos);
    expect(bp.ativo.totalCentavos).toBe(
      bp.ativo.totalCirculanteCentavos + bp.ativo.totalNaoCirculanteCentavos,
    );
    // Imobilizado pelo líquido: 6.000,00 − 100,00.
    expect(reais(bp.ativo.totalNaoCirculanteCentavos)).toBe("5.900,00");
  });

  it("R-DEM-04: o encerramento zera o resultado contra Lucros ou Prejuízos Acumulados", () => {
    const antes = empresaComVenda();
    const { estado, linhas } = executar(antes, { tipo: "encerramento" }, dia(31));
    expect(linhas.at(-1)).toEqual(["Lucros ou Prejuízos Acumulados", "C", "692,28"]);
    for (const conta of ["Receita Bruta de Vendas", "ICMS sobre Vendas", "Despesas com Salários"]) {
      expect(saldoDe(estado, conta), conta).toBe("0,00");
    }
    const bp = balanco(estado, dia(31));
    expect(bp.patrimonioLiquido.resultadoDoPeriodoCentavos).toBe(0);
    expect(bp.patrimonioLiquido.totalCentavos).toBe(
      balanco(antes, dia(31)).patrimonioLiquido.totalCentavos,
    );
    // A DRE do período continua mostrando o resultado apurado.
    expect(reais(dre(estado, { de: dia(1), ate: dia(31) }).resultadoCentavos)).toBe("692,28");
  });

  it("R-DEM-04: prejuízo é levado a débito de Lucros ou Prejuízos Acumulados", () => {
    const estado = executar(
      empresaComBanco(),
      { tipo: "provisao_salarios", valorCentavos: r("500,00") },
      dia(28),
    ).estado;
    expect(executar(estado, { tipo: "encerramento" }, dia(31)).linhas).toEqual([
      ["Despesas com Salários", "C", "500,00"],
      ["Lucros ou Prejuízos Acumulados", "D", "500,00"],
    ]);
  });
});

describe("bloqueios do motor fora das regras numeradas", () => {
  it("pagar ou comprar sem saldo em Caixa ou Bancos é bloqueado", () => {
    const erro = erroDe(() =>
      preverLancamentos(
        empresaComBanco(),
        compraDeMercadorias(100, "30,00", { tipo: "avista", meio: "caixa" }),
        dia(2),
      ),
    );
    expect(erro.codigo).toBe("saldo_insuficiente");
  });

  it("a data de uma operação não pode ser anterior ao último lançamento", () => {
    const estado = empresaComEstoque();
    const erro = erroDe(() =>
      preverLancamentos(estado, { tipo: "subscricao", valorCentavos: 100 }, dia(1)),
    );
    expect(erro.codigo).toBe("valor_invalido");
  });

  it("uma operação bloqueada não altera o estado", () => {
    const estado = empresaComEstoque();
    const copia: unknown = JSON.parse(JSON.stringify(estado));
    erroDe(() =>
      preverLancamentos(estado, vendaDeMercadorias(999, "50,00", { tipo: "avista" }), dia(3)),
    );
    expect(estado).toEqual(copia);
  });
});
