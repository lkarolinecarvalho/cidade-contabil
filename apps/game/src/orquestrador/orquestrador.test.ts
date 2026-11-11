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
  icmsARecuperar: "1.1.5",
  fornecedores: "2.1.1",
  salariosAPagar: "2.1.5",
  capital: "2.3.1",
  cmv: "4.1.1",
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
  it("compra a prazo: Estoque, ICMS a Recuperar e Fornecedores aumentam", () => {
    const estado = antesDe("m004-compra-prazo");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m004-compra-prazo"),
      estado.data,
    );
    expect(
      efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos).map((e) => [
        e.nome,
        e.direcao,
        e.valorCentavos,
      ]),
    ).toEqual([
      ["Estoque de Mercadorias", "aumenta", 1_640_000],
      ["ICMS a Recuperar", "aumenta", 360_000],
      ["Fornecedores", "aumenta", 2_000_000],
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
    const estado = antesDe("m005-venda-avista");
    const { lancamentos } = preverLancamentos(
      estado.contabil,
      operacaoDe(estado, "m005-venda-avista"),
      estado.data,
    );
    const efeito = efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos);
    expect(efeito).toHaveLength(10);
    expect(
      efeito.filter((e) => e.direcao === "diminui").map((e) => [e.nome, e.valorCentavos]),
    ).toEqual([["Estoque de Mercadorias", 20_500]]);
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
    const m = missao("m001-capital-autorizado");
    const [primeira] = selecionarAfirmativas(m, conteudo.afirmativas, novoJogo());
    expect(primeira).toBeDefined();
    const [segunda] = selecionarAfirmativas(m, conteudo.afirmativas, {
      ...novoJogo(),
      afirmativasVistas: { [primeira?.id ?? ""]: 1 },
    });
    expect(segunda?.conceitoId).toBe("capital-autorizado");
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
    // Três lançamentos de depreciação viram um débito de 608,33 e três créditos.
    expect(linhas).toHaveLength(4);
    expect(linhas[0]).toMatchObject({ lado: "D", valorCentavos: 60_833 });
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
    const estado = antesDe("m004-compra-prazo");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m004-compra-prazo"),
      [
        D(CONTAS.estoque, "16.400,00"),
        D(CONTAS.icmsARecuperar, "3.600,00"),
        C(CONTAS.fornecedores, "20.000,00"),
      ],
      estado.data,
    );
    expect(conferencia.comparacao.correto).toBe(true);
    expect(conferencia.previa).toBeNull();
    expect(conferencia.comentario).toBe("");
  });

  it("lançamento desequilibrado: só o aviso de débitos ≠ créditos, sem prévia", () => {
    const estado = antesDe("m004-compra-prazo");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m004-compra-prazo"),
      [D(CONTAS.estoque, "20.000,00"), C(CONTAS.fornecedores, "16.400,00")],
      estado.data,
    );
    expect(conferencia.previa).toBeNull();
    expect(conferencia.comentario).toContain("R$ 20.000,00");
    expect(conferencia.comentario).toContain("R$ 16.400,00");
    expect(conferencia.regras).toEqual(["R-GER-01"]);
  });

  it("capítulo 1 — lançar o capital autorizado: PL inflado sem dinheiro entrando", () => {
    const estado = antesDe("m001-capital-autorizado");
    const conferencia = conferirLancamento(
      estado.contabil,
      null,
      [D(CONTAS.bancos, "500.000,00"), C(CONTAS.capital, "500.000,00")],
      estado.data,
    );
    expect(conferencia.comparacao.correto).toBe(false);
    expect(conferencia.regras).toEqual(["R-CAP-02"]);
    expect(conferencia.comentario).toContain("R$ 500.000,00 maior");
    expect(conferencia.previa?.correto.patrimonioLiquidoCentavos).toBe(0);
    // Sem lançamento informado, o fato sem lançamento está correto.
    expect(conferirLancamento(estado.contabil, null, [], estado.data).comparacao.correto).toBe(
      true,
    );
  });

  it("capítulo 2 — imóvel de uso como Estoque: Ativo Circulante inflado", () => {
    const estado = antesDe("m002-compra-imovel");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m002-compra-imovel"),
      [D(CONTAS.estoque, "180.000,00"), C(CONTAS.bancos, "180.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toContain("R-IMO-02");
    expect(conferencia.comentario).toContain("R$ 180.000,00 maior");
    expect(conferencia.previa?.comOSeuLancamento.ativoNaoCirculanteCentavos).toBe(0);
    expect(conferencia.previa?.correto.ativoNaoCirculanteCentavos).toBe(18_000_000);
  });

  it("capítulo 4 — estoque pelo valor da nota: estoque superavaliado, ICMS a Recuperar zerado", () => {
    const estado = antesDe("m004-compra-avista");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m004-compra-avista"),
      [D(CONTAS.estoque, "40.000,00"), C(CONTAS.bancos, "40.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-COM-01", "R-ICMS-04"]);
    expect(conferencia.comentario).toMatch(/valor da nota/);
    expect(conferencia.comparacao.faltantes.map((f) => f.esperado.conta)).toEqual([
      CONTAS.icmsARecuperar,
    ]);
  });

  it("capítulo 4 — compra como despesa: prejuízo falso no mês", () => {
    const estado = antesDe("m004-compra-avista");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m004-compra-avista"),
      [D(CONTAS.cmv, "40.000,00"), C(CONTAS.bancos, "40.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-COM-04"]);
    expect(conferencia.comentario).toContain("prejuízo falso de R$ 40.000,00");
    expect(conferencia.previa?.comOSeuLancamento.resultadoDoMesCentavos).toBe(-4_000_000);
    expect(conferencia.previa?.correto.resultadoDoMesCentavos).toBe(0);
  });

  it("capítulo 5 — venda sem CMV: lucro superavaliado e estoque que não diminui", () => {
    const estado = antesDe("m005-venda-avista");
    const operacao = operacaoDe(estado, "m005-venda-avista");
    const semCmv = preverLancamentos(estado.contabil, operacao, estado.data)
      .lancamentos.flatMap((l) => l.partidas)
      .filter((p) => p.conta !== CONTAS.cmv && p.conta !== CONTAS.estoque);
    const conferencia = conferirLancamento(estado.contabil, operacao, semCmv, estado.data);
    expect(conferencia.regras).toEqual(["R-VEN-02"]);
    expect(conferencia.comentario).toContain("R$ 205,00 maior");
    expect(
      (conferencia.previa?.comOSeuLancamento.ativoCirculanteCentavos ?? 0) -
        (conferencia.previa?.correto.ativoCirculanteCentavos ?? 0),
    ).toBe(20_500);
  });

  it("capítulo 6 — salário lançado como pagamento: a despesa é do mês, o pagamento é outro fato", () => {
    const estado = antesDe("m006-salarios");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m006-salarios"),
      [D(CONTAS.despesaSalarios, "4.000,00"), C(CONTAS.bancos, "4.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-DES-01", "R-DES-02"]);
    expect(conferencia.comentario).toMatch(/Salários a Pagar/);
  });

  it("capítulo 6 — pagamento de salário como despesa nova: resultado pior do que é", () => {
    const estado = executarProximaOperacao(antesDe("m006-salarios"), missao("m006-salarios"));
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m006-salarios", 1),
      [D(CONTAS.despesaSalarios, "4.000,00"), C(CONTAS.bancos, "4.000,00")],
      estado.data,
    );
    expect(conferencia.regras).toEqual(["R-DES-01"]);
    expect(conferencia.comentario).toContain("R$ 4.000,00 pior");
  });

  it("lados trocados: a prévia lista as contas que ficariam com saldo diferente", () => {
    const estado = antesDe("m004-compra-avista");
    const conferencia = conferirLancamento(
      estado.contabil,
      operacaoDe(estado, "m004-compra-avista"),
      [
        C(CONTAS.estoque, "32.800,00"),
        C(CONTAS.icmsARecuperar, "7.200,00"),
        D(CONTAS.bancos, "40.000,00"),
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
      ["Bancos Conta Movimento", 14_000_000, 6_000_000],
      ["Estoque de Mercadorias", -3_280_000, 3_280_000],
      ["ICMS a Recuperar", -720_000, 720_000],
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
  it("capítulos 1 a 7 de ponta a ponta; a DRE e o Balanço batem com o cenário da campanha", () => {
    let estado = novoJogo();
    let afirmativasRespondidas = 0;

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
        // Efeito: toda operação da campanha mexe em pelo menos duas contas.
        expect(
          efeitoDosLancamentos(estado.contabil.planoDeContas, lancamentos).length,
          m.id,
        ).toBeGreaterThanOrEqual(2);
        // Lançamento: o jogador monta o lançamento certo e o motor confirma.
        const leitura = lerLinhas(linhasIniciais("pronto", linhasEsperadas(lancamentos)));
        if (!leitura.ok) throw new Error(leitura.erro);
        expect(
          conferirLancamento(estado.contabil, operacao, leitura.partidas, estado.data).comparacao
            .correto,
          m.id,
        ).toBe(true);
        estado = executarProximaOperacao(estado, m);
      }
      estado = concluirMissao(estado, m);
    }

    expect(estado.missoesConcluidas).toHaveLength(conteudo.missoes.length);
    expect(afirmativasRespondidas).toBeGreaterThan(12);

    const fim = { ...estado.data, dia: 30 };
    const d = dre(estado.contabil, { de: { ...fim, dia: 1 }, ate: fim });
    expect(d.totalReceitaBrutaCentavos).toBe(350_000);
    expect(d.receitaLiquidaCentavos).toBe(276_524);
    expect(d.lucroBrutoCentavos).toBe(133_024);
    expect(d.resultadoCentavos).toBe(-427_809);

    const bp = balanco(estado.contabil, fim);
    expect(bp.ativo.totalCirculanteCentavos).toBe(10_643_500);
    expect(bp.ativo.totalNaoCirculanteCentavos).toBe(19_939_167);
    expect(bp.ativo.totalCentavos).toBe(30_582_667);
    expect(bp.passivo.totalCirculanteCentavos).toBe(1_010_476);
    expect(bp.patrimonioLiquido.totalCentavos).toBe(29_572_191);
    expect(estado.carteiraCentavos).toBe(1_000_000);
  });
});
