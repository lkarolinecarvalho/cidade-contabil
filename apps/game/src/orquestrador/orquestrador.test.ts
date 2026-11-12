import { carregarConteudoDoJogo, type Missao, paraOperacaoDoMotor } from "@cidade/content";
import {
  balanco,
  dre,
  type Operacao,
  type Partida,
  preverLancamentos,
  REGRAS,
} from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import {
  concluirMissao,
  type EstadoDoJogo,
  executarProximaOperacao,
  jogarMissaoInteira,
  novoJogo,
  prepararParaOperacao,
  registrarResposta,
} from "../state/jogo";
import { lerReais } from "../texto/dinheiro";
import { regrasComTexto, textoDaRegra } from "../texto/regras";
import { limiteDeAfirmativas, selecionarAfirmativas } from "./afirmativas";
import { efeitoDosLancamentos } from "./efeito";
import {
  ajudaDaMissao,
  conferirLancamento,
  lerLinhas,
  linhasEsperadas,
  linhasIniciais,
  linhaVazia,
} from "./lancamento";

const conteudo = carregarConteudoDoJogo();
const missao = (id: string): Missao => {
  const encontrada = conteudo.missoes.find((m) => m.id === id);
  if (!encontrada) throw new Error(`Missão não encontrada: ${id}`);
  return encontrada;
};

/** Estado logo antes da missão informada. */
function antesDe(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of conteudo.missoes) {
    if (m.id === id) return estado;
    estado = jogarMissaoInteira(estado, m);
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

/** Operação do motor da primeira operação da missão. */
function operacaoDe(estado: EstadoDoJogo, id: string, indice = 0): Operacao {
  const operacao = missao(id).operacoes[indice];
  if (!operacao) throw new Error(`Operação ${indice} não existe em ${id}`);
  return paraOperacaoDoMotor(operacao, { mes: estado.data });
}

const CONTAS = {
  caixa: "1.1.1",
  bancos: "1.1.2",
  estoque: "1.1.4",
  estoqueInsumos: "1.1.6",
  icmsARecuperar: "1.1.5",
  fornecedores: "2.1.1",
  salariosAPagar: "2.1.5",
  capital: "2.3.1",
  cmv: "4.1.1",
  cpv: "4.1.2",
  despesaSalarios: "4.2.1",
} as const;
const D = (conta: string, reais: string): Partida => ({
  conta,
  lado: "D",
  valorCentavos: lerReais(reais) ?? 0,
});
const C = (conta: string, reais: string): Partida => ({
  conta,
  lado: "C",
  valorCentavos: lerReais(reais) ?? 0,
});

describe("efeito no patrimônio", () => {
  it("compra de insumos a prazo: Estoque de Insumos, ICMS a Recuperar e Fornecedores aumentam", () => {
    const estado = antesDe("m011-insumos-com-icms");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m011-insumos-com-icms"),
      estado.data,
    );
    expect(
      efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos).map((e) => [
        e.nome,
        e.direcao,
        e.valorCentavos,
      ]),
    ).toEqual([
      ["Estoque de Insumos", "aumenta", 266_500],
      ["ICMS a Recuperar", "aumenta", 58_500],
      ["Fornecedores", "aumenta", 325_000],
    ]);
  });

  it("integralização: Bancos aumenta e a conta redutora Capital a Integralizar diminui", () => {
    const estado = antesDe("m001-integralizacao");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m001-integralizacao"),
      estado.data,
    );
    expect(
      efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos).map((e) => [
        e.nome,
        e.direcao,
      ]),
    ).toEqual([
      ["Bancos Conta Movimento", "aumenta"],
      ["(−) Capital a Integralizar", "diminui"],
    ]);
  });

  it("venda: o estoque diminui pelo custo e as demais contas aumentam", () => {
    const estado = antesDe("m011-venda-com-tributos");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m011-venda-com-tributos"),
      estado.data,
    );
    const efeito = efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos);
    expect(efeito).toHaveLength(12);
    // O refrigerante sai pelo custo; os insumos, pela receita do hambúrguer.
    expect(
      efeito.filter((e) => e.direcao === "diminui").map((e) => [e.nome, e.valorCentavos]),
    ).toEqual([
      ["Estoque de Mercadorias", 27_000],
      ["Estoque de Insumos", 118_300],
    ]);
  });
});

describe("seleção de afirmativas", () => {
  it("escolhe uma por conceito da missão, até o limite, só do nível liberado", () => {
    for (const m of conteudo.missoes) {
      const escolhidas = selecionarAfirmativas(m, conteudo.afirmativas, novoJogo());
      expect(escolhidas.length, m.id).toBe(Math.min(m.conceitos.length, limiteDeAfirmativas(m)));
      expect(new Set(escolhidas.map((a) => a.conceitoId)).size).toBe(escolhidas.length);
      for (const a of escolhidas) {
        expect(m.conceitos).toContain(a.conceitoId);
        expect(a.nivelMin).toBeLessThanOrEqual(m.nivel);
      }
    }
  });

  it("prefere a variante menos vista do conceito", () => {
    const m = missao("m003-integralizacao-final");
    const [primeira] = selecionarAfirmativas(m, conteudo.afirmativas, novoJogo());
    expect(primeira).toBeDefined();
    const [segunda] = selecionarAfirmativas(m, conteudo.afirmativas, {
      ...novoJogo(),
      afirmativasVistas: { [primeira?.id ?? ""]: 1 },
    });
    expect(segunda?.conceitoId).toBe("capital-a-integralizar");
    expect(segunda?.id).not.toBe(primeira?.id);
  });
});

describe("níveis de ajuda no lançamento", () => {
  const esperadas = [
    D(CONTAS.estoque, "2.460,00"),
    D(CONTAS.icmsARecuperar, "540,00"),
    C(CONTAS.fornecedores, "3.000,00"),
  ];

  it("a ajuda segue o nível da missão quando o conteúdo diz auto", () => {
    expect(ajudaDaMissao({ ajudaLancamento: "auto", nivel: 1 })).toBe("pronto");
    expect(ajudaDaMissao({ ajudaLancamento: "auto", nivel: 2 })).toBe("contas_sugeridas");
    expect(ajudaDaMissao({ ajudaLancamento: "auto", nivel: 3 })).toBe("contas_e_valores");
    expect(ajudaDaMissao({ ajudaLancamento: "auto", nivel: 4 })).toBe("livre");
    expect(ajudaDaMissao({ ajudaLancamento: "auto", nivel: 5 })).toBe("livre");
    expect(ajudaDaMissao({ ajudaLancamento: "pronto", nivel: 4 })).toBe("pronto");
  });

  it("pronto: tudo preenchido, só confirmar", () => {
    const linhas = linhasIniciais("pronto", esperadas);
    expect(linhas.every((l) => l.fixo.conta && l.fixo.lado && l.fixo.valor)).toBe(true);
    expect(lerLinhas(linhas)).toEqual({ ok: true, partidas: esperadas });
  });

  it("contas sugeridas: contas e valores dados; o jogador escolhe débito ou crédito", () => {
    const linhas = linhasIniciais("contas_sugeridas", esperadas);
    expect(linhas.map((l) => [l.conta, l.lado, l.valor])).toEqual([
      [CONTAS.estoque, null, "2.460,00"],
      [CONTAS.icmsARecuperar, null, "540,00"],
      [CONTAS.fornecedores, null, "3.000,00"],
    ]);
    expect(lerLinhas(linhas)).toEqual({ ok: false, erro: "Marque débito ou crédito na linha 1." });
  });

  it("contas e valores: o número de linhas é dado; o resto é do jogador", () => {
    const linhas = linhasIniciais("contas_e_valores", esperadas);
    expect(linhas).toHaveLength(3);
    expect(linhas.every((l) => l.conta === "" && l.lado === null && l.valor === "")).toBe(true);
  });

  it("livre: começa com duas linhas vazias", () => {
    expect(linhasIniciais("livre", esperadas)).toEqual([linhaVazia(0), linhaVazia(1)]);
  });

  it("linhasEsperadas soma o que cai na mesma conta e no mesmo lado", () => {
    const estado = antesDe("m007-depreciacao");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m007-depreciacao"),
      estado.data,
    );
    const linhas = linhasEsperadas(lancamentos);
    // Três lançamentos de depreciação viram um débito de 383,33 e três créditos.
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toMatchObject({ lado: "D", valorCentavos: 38_333 });
  });

  it("lerLinhas aponta o que falta em cada linha", () => {
    const linha = { ...linhaVazia(0), conta: CONTAS.caixa, lado: "D" as const };
    expect(lerLinhas([])).toMatchObject({ ok: false });
    expect(lerLinhas([linhaVazia(0)])).toEqual({ ok: false, erro: "Escolha a conta da linha 1." });
    expect(lerLinhas([{ ...linha, valor: "abc" }])).toMatchObject({ ok: false });
    expect(lerLinhas([{ ...linha, valor: "0,00" }])).toMatchObject({ ok: false });
    expect(lerLinhas([{ ...linha, valor: "1.234,5" }])).toEqual({
      ok: true,
      partidas: [{ conta: CONTAS.caixa, lado: "D", valorCentavos: 123_450 }],
    });
  });

  it("lerReais lê valores em reais sem ponto flutuante", () => {
    expect(lerReais("3.000,00")).toBe(300_000);
    expect(lerReais("3000")).toBe(300_000);
    expect(lerReais("R$ 2,67")).toBe(267);
    expect(lerReais("0,1")).toBe(10);
    expect(lerReais("1.00,00")).toBeNull();
    expect(lerReais("12,345")).toBeNull();
    expect(lerReais("-5,00")).toBeNull();
    expect(lerReais("")).toBeNull();
  });
});

describe("conferência do lançamento e comentário do contador (erros didáticos)", () => {
  it("lançamento correto não tem prévia nem comentário", () => {
    const estado = antesDe("m011-insumos-com-icms");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m011-insumos-com-icms"),
      [
        D(CONTAS.estoqueInsumos, "2.665,00"),
        D(CONTAS.icmsARecuperar, "585,00"),
        C(CONTAS.fornecedores, "3.250,00"),
      ],
      estado.data,
    );
    expect(conferencia.comparacao.correto).toBe(true);
    expect(conferencia.previa).toBeNull();
    expect(conferencia.comentario).toBe("");
  });

  it("lançamento desequilibrado: só o aviso de débitos ≠ créditos, sem prévia", () => {
    const estado = antesDe("m011-insumos-com-icms");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m011-insumos-com-icms"),
      [D(CONTAS.estoque, "20.000,00"), C(CONTAS.fornecedores, "16.400,00")],
      estado.data,
    );
    expect(conferencia.previa).toBeNull();
    expect(conferencia.comentario).toContain("R$ 20.000,00");
    expect(conferencia.comentario).toContain("R$ 16.400,00");
    expect(conferencia.regras).toEqual(["R-GER-01"]);
  });

  it("consignação — lançar a mercadoria recebida: ela não é da casa", () => {
    const estado = antesDe("m009-consignacao");
    const operacao = operacaoDe(estado, "m009-consignacao");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacao,
      [D(CONTAS.estoque, "900,00"), C(CONTAS.fornecedores, "900,00")],
      estado.data,
    );
    expect(conferencia.comparacao.correto).toBe(false);
    expect(conferencia.regras).toEqual(["R-CSG-01"]);
    expect(conferencia.comentario).toMatch(/não gera lançamento/);
    // Com o lançamento errado, o Ativo e o Passivo apareceriam maiores do que são.
    expect(
      (conferencia.previa?.comOSeuLancamento.totalDoAtivoCentavos ?? 0) -
        (conferencia.previa?.correto.totalDoAtivoCentavos ?? 0),
    ).toBe(90_000);
    // Sem lançamento informado, está correto.
    expect(conferirLancamento(estado.contabil, operacao, [], estado.data).comparacao.correto).toBe(
      true,
    );
  });

  it("fato que não é operação do motor: o esperado é nenhum lançamento", () => {
    const estado = novoJogo();
    const conferencia = conferirLancamento(
      estado.contabil,
      null,
      [D(CONTAS.bancos, "500.000,00"), C(CONTAS.capital, "500.000,00")],
      estado.data,
    );
    expect(conferencia.comparacao.correto).toBe(false);
    expect(conferencia.regras).toEqual(["R-CAP-02"]);
    expect(conferencia.comentario).toContain("R$ 500.000,00 maior");
    expect(conferirLancamento(estado.contabil, null, [], estado.data).comparacao.correto).toBe(
      true,
    );
  });

  it("capítulo 2 — imóvel de uso como Estoque: Ativo Circulante inflado", () => {
    const estado = antesDe("m002-compra-imovel");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m002-compra-imovel"),
      [D(CONTAS.estoque, "60.000,00"), C(CONTAS.bancos, "60.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toContain("R-IMO-02");
    expect(conferencia.comentario).toContain("R$ 60.000,00 maior");
    expect(conferencia.previa?.comOSeuLancamento.ativoNaoCirculanteCentavos).toBe(0);
    expect(conferencia.previa?.correto.ativoNaoCirculanteCentavos).toBe(6_000_000);
  });

  it("capítulo 4 — estoque pelo valor da nota: estoque superavaliado, ICMS a Recuperar zerado", () => {
    const estado = antesDe("m011-refrigerante-da-fabrica");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m011-refrigerante-da-fabrica"),
      [D(CONTAS.estoque, "1.560,00"), C(CONTAS.bancos, "1.560,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-COM-01", "R-ICMS-04"]);
    expect(conferencia.comentario).toMatch(/valor da nota/);
    expect(conferencia.comparacao.faltantes.map((f) => f.esperado.conta)).toEqual([
      CONTAS.icmsARecuperar,
    ]);
  });

  it("capítulo 4 — compra como despesa: prejuízo falso no mês", () => {
    const estado = antesDe("m011-refrigerante-da-fabrica");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m011-refrigerante-da-fabrica"),
      [D(CONTAS.cmv, "1.560,00"), C(CONTAS.bancos, "1.560,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-COM-04"]);
    expect(conferencia.comentario).toContain("prejuízo falso de R$ 1.560,00");
    // A compra certa não mexe no resultado; como despesa, ele cairia R$ 1.560,00.
    expect(
      (conferencia.previa?.comOSeuLancamento.resultadoDoMesCentavos ?? 0) -
        (conferencia.previa?.correto.resultadoDoMesCentavos ?? 0),
    ).toBe(-156_000);
  });

  it("capítulo 5 — venda sem CMV: lucro superavaliado e estoque que não diminui", () => {
    const estado = antesDe("m011-venda-com-tributos");
    const operacao = operacaoDe(estado, "m011-venda-com-tributos");
    const semCmv = preverLancamentos(estado.contabil, operacao, estado.data)
      .lancamentos.flatMap((l) => l.partidas)
      .filter(
        (p) =>
          p.conta !== CONTAS.cmv &&
          p.conta !== CONTAS.cpv &&
          p.conta !== CONTAS.estoque &&
          p.conta !== CONTAS.estoqueInsumos,
      );
    const conferencia = conferirLancamento(estado.contabil, operacao, semCmv, estado.data);
    expect(conferencia.regras).toEqual(["R-VEN-02"]);
    // 270,00 de refrigerante mais 1.183,00 de insumos dos hambúrgueres.
    expect(conferencia.comentario).toContain("R$ 1.453,00 maior");
    expect(
      (conferencia.previa?.comOSeuLancamento.ativoCirculanteCentavos ?? 0) -
        (conferencia.previa?.correto.ativoCirculanteCentavos ?? 0),
    ).toBe(145_300);
  });

  it("capítulo 6 — salário lançado como pagamento: a despesa é do mês, o pagamento é outro fato", () => {
    const estado = antesDe("m006-salarios");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m006-salarios"),
      [D(CONTAS.despesaSalarios, "3.000,00"), C(CONTAS.bancos, "3.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-DES-01", "R-DES-02"]);
    expect(conferencia.comentario).toMatch(/Salários a Pagar/);
  });

  it("pagamento a fornecedor lançado como despesa nova: resultado pior do que é", () => {
    const estado = antesDe("m008-pagamento-antecipado");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m008-pagamento-antecipado"),
      [D(CONTAS.despesaSalarios, "2.800,00"), C(CONTAS.bancos, "2.800,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-DES-01"]);
    // A despesa falsa de 2.800,00 e a receita financeira de 56,00 que deixou de aparecer.
    expect(conferencia.comentario).toContain("R$ 2.856,00 pior");
  });

  it("lados trocados: a prévia lista as contas que ficariam com saldo diferente", () => {
    const estado = antesDe("m011-refrigerante-da-fabrica");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m011-refrigerante-da-fabrica"),
      [
        C(CONTAS.estoque, "1.290,00"),
        C(CONTAS.icmsARecuperar, "270,00"),
        D(CONTAS.bancos, "1.560,00"),
      ],
      estado.data,
    );
    expect(conferencia.comentario).toMatch(/lados estão trocados/);
    // Os totais não mudam (tudo dentro do Ativo Circulante), mas as contas, sim.
    expect(conferencia.previa?.comOSeuLancamento).toEqual(conferencia.previa?.correto);
    expect(
      conferencia.previa?.contas.map((c) => [
        c.nome,
        c.comOSeuLancamentoCentavos,
        c.corretoCentavos,
      ]),
    ).toEqual([
      ["Bancos Conta Movimento", 1_956_000, 1_644_000],
      ["Estoque de Mercadorias", -69_000, 189_000],
      ["ICMS a Recuperar", 31_500, 85_500],
    ]);
  });

  it("erro fora dos previstos: descreve o que a prévia mostra", () => {
    const estado = antesDe("m006-energia");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m006-energia"),
      [D(CONTAS.estoque, "1.000,00"), C(CONTAS.bancos, "1.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual([]);
    expect(conferencia.comentario).toMatch(/resultado do mês seria/);
  });
});

describe("texto das regras", () => {
  it("toda regra do motor tem o texto de docs/regras-contabeis.md", () => {
    expect(regrasComTexto()).toEqual([...REGRAS]);
    for (const regra of REGRAS) expect(textoDaRegra(regra).length, regra).toBeGreaterThan(10);
    expect(textoDaRegra("R-CAP-02")).toMatch(/^Capital autorizado é o limite estatutário/);
    expect(textoDaRegra("R-CAP-02")).not.toMatch(/\*\*|\n/);
  });
});

describe("campanha jogada pelo ciclo completo (aceite do M5)", () => {
  it("capítulos 1 a 8 de ponta a ponta; a DRE e o Balanço batem com o cenário da campanha", () => {
    let estado = novoJogo();
    let afirmativasRespondidas = 0;
    const semLancamento: string[] = [];

    for (const m of conteudo.missoes) {
      // Negociação aceita → afirmativas da missão.
      for (const afirmativa of selecionarAfirmativas(m, conteudo.afirmativas, estado)) {
        estado = registrarResposta(estado, afirmativa, afirmativa.gabarito);
        afirmativasRespondidas++;
      }

      if (m.operacoes.length === 0) {
        // Fato sem lançamento: a resposta certa é não lançar nada.
        expect(conferirLancamento(estado.contabil, null, [], estado.data).comparacao.correto).toBe(
          true,
        );
      }

      for (const operacaoDaMissao of m.operacoes) {
        estado = prepararParaOperacao(estado, m);
        const operacao = paraOperacaoDoMotor(operacaoDaMissao, { mes: estado.data });
        const { lancamentos } = preverLancamentos(estado.contabil, operacao, estado.data);
        // Efeito: toda operação com lançamento mexe em pelo menos duas contas. As da
        // consignação (receber e devolver) não geram lançamento nem efeito.
        const efeitos = efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos).length;
        if (lancamentos.length === 0) {
          semLancamento.push(m.id);
          expect(efeitos, m.id).toBe(0);
        } else {
          expect(efeitos, m.id).toBeGreaterThanOrEqual(2);
        }
        // Lançamento: o jogador monta o lançamento certo e o motor confirma.
        // Quando não há o que lançar, a resposta certa é nenhuma linha.
        let partidas: readonly Partida[] = [];
        if (lancamentos.length > 0) {
          const leitura = lerLinhas(linhasIniciais("pronto", linhasEsperadas(lancamentos)));
          if (!leitura.ok) throw new Error(leitura.erro);
          partidas = leitura.partidas;
        }
        expect(
          conferirLancamento(estado.contabil, operacao, partidas, estado.data).comparacao.correto,
          m.id,
        ).toBe(true);
        estado = executarProximaOperacao(estado, m);
      }
      estado = concluirMissao(estado, m);
    }

    expect(estado.missoesConcluidas).toHaveLength(conteudo.missoes.length);
    expect(semLancamento).toEqual(["m009-consignacao", "m009-devolver-consignado"]);
    expect(afirmativasRespondidas).toBeGreaterThan(12);

    const fim = { ...estado.data, dia: 30 };
    const d = dre(estado.contabil, { de: { ...fim, dia: 1 }, ate: fim });
    expect(d.totalReceitaBrutaCentavos).toBe(2_490_000);
    expect(d.receitaLiquidaCentavos).toBe(2_160_116);
    expect(d.lucroBrutoCentavos).toBe(1_321_522);
    expect(d.resultadoCentavos).toBe(889_425);

    const bp = balanco(estado.contabil, fim);
    expect(bp.ativo.totalCirculanteCentavos).toBe(3_844_842);
    expect(bp.ativo.totalNaoCirculanteCentavos).toBe(7_761_667);
    expect(bp.ativo.totalCentavos).toBe(11_606_509);
    expect(bp.passivo.totalCirculanteCentavos).toBe(717_084);
    expect(bp.patrimonioLiquido.totalCentavos).toBe(10_889_425);
    expect(estado.carteiraCentavos).toBe(1_000_000);
  });
});
