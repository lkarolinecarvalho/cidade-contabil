import { carregarConteudoDoJogo, type Missao, paraOperacaoDoMotor } from "@cidade/content";
import type { Operacao, Partida } from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import {
  type EstadoDoJogo,
  jogarMissaoInteira,
  novoJogo,
  pagarIpi,
  registrarTema,
} from "../state/jogo";
import { lerReais } from "../texto/dinheiro";
import { campanhaPorCapitulo } from "../ui/Missoes";
import { proximoDestino } from "../ui/ProximoDestino";
import { contasComMovimento, diario, planoPorGrupo, razaoDaConta } from "./consulta";
import {
  embaralhar,
  linhasDaDreEmbaralhadas,
  ORDEM_DA_DRE,
  RODADAS_POR_DESAFIO,
  rodadasDeClassificacao,
  rodadasDeNatureza,
} from "./desafios";
import { classificacaoDaConta, efeitoDosLancamentos } from "./efeito";
import { conferirLancamento } from "./lancamento";

const conteudo = carregarConteudoDoJogo();
const missao = (id: string): Missao => {
  const encontrada = conteudo.missoes.find((m) => m.id === id);
  if (!encontrada) throw new Error(`Missão não encontrada: ${id}`);
  return encontrada;
};

function jogarAte(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of conteudo.missoes) {
    estado = jogarMissaoInteira(estado, m);
    if (m.id === id) return estado;
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

function antesDe(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of conteudo.missoes) {
    if (m.id === id) return estado;
    estado = jogarMissaoInteira(estado, m);
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

const operacaoDe = (estado: EstadoDoJogo, id: string): Operacao => {
  const operacao = missao(id).operacoes[0];
  if (!operacao) throw new Error(`Sem operação em ${id}`);
  return paraOperacaoDoMotor(operacao, { mes: estado.data });
};

const partida = (lado: "D" | "C", conta: string, reais: string): Partida => ({
  conta,
  lado,
  valorCentavos: lerReais(reais) ?? 0,
});
const D = (conta: string, reais: string) => partida("D", conta, reais);
const C = (conta: string, reais: string) => partida("C", conta, reais);

const CONTAS = {
  caixa: "1.1.1",
  bancos: "1.1.2",
  clientes: "1.1.3",
  estoque: "1.1.4",
  icmsARecuperar: "1.1.5",
  estoqueInsumos: "1.1.6",
  produtosAcabados: "1.1.7",
  materialDeConsumo: "1.1.8",
  fornecedores: "2.1.1",
  receita: "3.1.1",
  descontosObtidos: "3.3.1",
  despesaSalarios: "4.2.1",
} as const;

describe("classificação das contas (efeito no patrimônio)", () => {
  const plano = novoJogo().contabil.planoDeContas;
  const classificacao = (nome: string) => {
    const conta = plano.contas.find((c) => c.nome === nome);
    if (!conta) throw new Error(`Conta não encontrada: ${nome}`);
    return classificacaoDaConta(conta);
  };

  it("mostra o grupo e o subgrupo, como no Balanço e na DRE", () => {
    expect(classificacao("Caixa")).toBe("Ativo Circulante");
    expect(classificacao("Equipamentos")).toBe("Ativo Não Circulante — Imobilizado");
    expect(classificacao("Fornecedores")).toBe("Passivo Circulante");
    expect(classificacao("Capital Social Subscrito")).toBe("Patrimônio Líquido");
    expect(classificacao("ICMS sobre Vendas")).toBe("Resultado — Dedução da receita bruta");
    expect(classificacao("Descontos Financeiros Obtidos")).toBe("Resultado — Receita financeira");
  });

  it("marca as contas redutoras", () => {
    expect(classificacao("(−) Capital a Integralizar")).toBe("Patrimônio Líquido (conta redutora)");
    expect(classificacao("(−) Depreciação Acumulada — Equipamentos")).toBe(
      "Ativo Não Circulante — Imobilizado (conta redutora)",
    );
  });

  it("o efeito de uma operação traz a classificação de cada conta", () => {
    const depois = jogarAte("m003-equipamentos");
    const efeito = efeitoDosLancamentos(
      depois.contabil.planoDeContas,
      depois.contabil.lancamentos.slice(-1),
    );
    expect(efeito.map((e) => [e.nome, e.classificacao, e.direcao])).toEqual([
      ["Equipamentos", "Ativo Não Circulante — Imobilizado", "aumenta"],
      ["Bancos Conta Movimento", "Ativo Circulante", "diminui"],
    ]);
  });
});

describe("Consulta do Escritório", () => {
  const fim = jogarAte("m007-apuracao-icms");

  it("o plano de contas vem por grupo, com natureza, redutoras e saldo", () => {
    const grupos = planoPorGrupo(fim.contabil);
    expect(grupos.map((g) => g.classificacao).slice(0, 4)).toEqual([
      "Ativo Circulante",
      "Ativo Não Circulante — Imobilizado",
      "Passivo Circulante",
      "Patrimônio Líquido",
    ]);
    const todas = grupos.flatMap((g) => g.contas);
    expect(todas).toHaveLength(fim.contabil.planoDeContas.contas.length);
    expect(todas.find((c) => c.nome === "Caixa")).toMatchObject({
      natureza: "devedora",
      redutora: false,
      saldoCentavos: 760_000,
    });
    expect(todas.filter((c) => c.redutora).map((c) => c.codigo)).toEqual([
      "1.2.3.8",
      "1.2.3.9",
      "1.2.3.10",
      "2.3.2",
    ]);
  });

  it("o Diário lista todos os lançamentos, do mais recente para o mais antigo", () => {
    const registros = diario(fim.contabil);
    expect(registros).toHaveLength(fim.contabil.lancamentos.length);
    expect(registros[0]?.historico).toBe("Apuração do IPI do mês");
    expect(registros.at(-1)).toMatchObject({
      historico: "Subscrição de capital social",
      partidas: [
        { lado: "D", conta: "(−) Capital a Integralizar", valorCentavos: 10_000_000 },
        { lado: "C", conta: "Capital Social Subscrito", valorCentavos: 10_000_000 },
      ],
    });
  });

  it("o Razão de uma conta soma débitos e créditos e dá o saldo e o lado", () => {
    const fornecedores = razaoDaConta(fim.contabil, CONTAS.fornecedores);
    expect(fornecedores).toMatchObject({
      nome: "Fornecedores",
      natureza: "credora",
      saldoCentavos: 267_000,
      ladoDoSaldo: "C",
    });
    expect(
      (fornecedores?.totalCreditosCentavos ?? 0) - (fornecedores?.totalDebitosCentavos ?? 0),
    ).toBe(267_000);
    // ICMS a Recuperar foi todo compensado na apuração.
    expect(razaoDaConta(fim.contabil, CONTAS.icmsARecuperar)).toMatchObject({
      saldoCentavos: 0,
      ladoDoSaldo: null,
    });
    expect(razaoDaConta(fim.contabil, "9.9.9")).toBeNull();
  });

  it("só as contas com movimento têm Razão para mostrar", () => {
    expect(contasComMovimento(novoJogo().contabil)).toEqual([]);
    const usadas = contasComMovimento(jogarAte("m001-integralizacao").contabil);
    expect(usadas.map((c) => c.nome)).toEqual([
      "Bancos Conta Movimento",
      "Capital Social Subscrito",
      "(−) Capital a Integralizar",
    ]);
  });
});

describe("Desafios do Escritório", () => {
  const plano = novoJogo().contabil.planoDeContas;

  it("o sorteio é repetível: a mesma semente dá a mesma ordem", () => {
    const lista = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(embaralhar(lista, 7)).toEqual(embaralhar(lista, 7));
    expect(embaralhar(lista, 7)).not.toEqual(embaralhar(lista, 8));
    expect([...embaralhar(lista, 7)].sort()).toEqual(lista);
    // A lista original não muda.
    expect(lista).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("onde fica a conta: quatro opções diferentes, uma delas a certa", () => {
    for (const semente of [1, 2, 3, 50]) {
      const rodadas = rodadasDeClassificacao(plano, semente);
      expect(rodadas).toHaveLength(RODADAS_POR_DESAFIO);
      for (const rodada of rodadas) {
        expect(new Set(rodada.opcoes).size).toBe(4);
        expect(rodada.opcoes).toContain(rodada.correta);
        const conta = plano.contas.find((c) => c.nome === rodada.conta);
        expect(conta && classificacaoDaConta(conta).startsWith(rodada.correta)).toBe(true);
      }
    }
  });

  it("devedora ou credora: a resposta certa é a natureza da conta", () => {
    for (const rodada of rodadasDeNatureza(plano, 4)) {
      const conta = plano.contas.find((c) => c.nome === rodada.conta);
      expect(rodada.correta.toLowerCase().startsWith(conta?.natureza ?? "?")).toBe(true);
      expect(rodada.opcoes).toHaveLength(2);
    }
  });

  it("monte a DRE: as mesmas linhas, nunca já na ordem certa", () => {
    expect(ORDEM_DA_DRE[0]).toBe("Receita Bruta de Vendas");
    expect(ORDEM_DA_DRE.at(-1)).toBe("= Resultado do período");
    for (let semente = 0; semente < 30; semente++) {
      const linhas = linhasDaDreEmbaralhadas(semente);
      expect([...linhas].sort()).toEqual([...ORDEM_DA_DRE].sort());
      expect(linhas).not.toEqual(ORDEM_DA_DRE);
    }
  });
});

describe("painel de Missões e aviso do próximo destino", () => {
  it("no começo, a primeira missão é a atual e as outras estão em breve", () => {
    const capitulos = campanhaPorCapitulo([]);
    expect(capitulos.map((c) => c.titulo)).toEqual(conteudo.capitulos.map((c) => c.titulo));
    const situacoes = capitulos.flatMap((c) => c.missoes.map((m) => m.situacao));
    expect(situacoes).toHaveLength(conteudo.missoes.length);
    expect(situacoes[0]).toBe("atual");
    expect(situacoes.slice(1).every((s) => s === "em_breve")).toBe(true);
  });

  it("acompanha o progresso: feitas, atual e em breve, com a conta por capítulo", () => {
    const estado = jogarAte("m004-compra-avista");
    const capitulos = campanhaPorCapitulo(estado.missoesConcluidas);
    // Duas conversas com a Marta e seis missões com operação.
    expect(capitulos[0]).toMatchObject({ concluidas: 8 });
    expect(capitulos[1]?.concluidas).toBe(1);
    expect(capitulos[1]?.missoes.map((m) => m.situacao)).toEqual([
      "concluida",
      "atual",
      "em_breve",
    ]);
    // Campanha concluída: nenhuma atual.
    const fim = campanhaPorCapitulo(conteudo.missoes.map((m) => m.id));
    expect(fim.flatMap((c) => c.missoes).every((m) => m.situacao === "concluida")).toBe(true);
  });

  it("o aviso diz aonde ir, com a preposição certa", () => {
    const hoje = { ano: 1, mes: 1, dia: 3 };
    // O primeiro destino do jogo é a Marta, no Escritório.
    expect(proximoDestino(conteudo.missoes[0], hoje)).toEqual({
      instrucao: "Vá ao Escritório Contábil",
      missao: "Começando do zero",
    });
    expect(proximoDestino(missao("m001-integralizacao"), hoje)).toEqual({
      instrucao: "Vá ao Banco",
      missao: "A primeira integralização",
    });
    expect(proximoDestino(missao("m003-moveis"), hoje)?.instrucao).toBe("Vá à Hamburgueria");
    expect(proximoDestino(missao("m002-compra-imovel"), hoje)?.instrucao).toBe("Vá à Imobiliária");
    expect(proximoDestino(undefined, hoje)).toBeNull();
  });

  it("no fechamento, o aviso manda avançar até o último dia", () => {
    const fechamento = missao("m007-depreciacao");
    expect(proximoDestino(fechamento, { ano: 1, mes: 1, dia: 12 })?.instrucao).toBe(
      "No dia 30, vá ao Escritório Contábil",
    );
    expect(proximoDestino(fechamento, { ano: 1, mes: 1, dia: 30 })).toEqual({
      instrucao: "Vá ao Escritório Contábil",
      missao: fechamento.titulo,
    });
  });
});

describe("teoria e IPI no estado do jogo", () => {
  it("o tema estudado guarda o melhor resultado e só pontua pelo que melhorou", () => {
    let estado = registrarTema(novoJogo(), "regimes-contabeis", 1);
    expect(estado.teoria).toEqual({ "regimes-contabeis": 1 });
    expect(estado.pontos).toBe(10);
    // Repetir com resultado pior não tira nada; melhorar soma só a diferença.
    estado = registrarTema(estado, "regimes-contabeis", 0);
    expect(estado.teoria["regimes-contabeis"]).toBe(1);
    expect(estado.pontos).toBe(10);
    estado = registrarTema(estado, "regimes-contabeis", 2);
    expect(estado.pontos).toBe(20);
  });

  it("o IPI apurado com saldo devedor é pago no Posto Fiscal (R-IPI-06)", () => {
    expect(() => pagarIpi(novoJogo())).toThrow(/Não há IPI/);
    const fim = jogarAte("m007-apuracao-icms");
    expect(fim.ipiAPagarCentavos).toBe(13_000);
    const bancosAntes = razaoDaConta(fim.contabil, CONTAS.bancos)?.saldoCentavos ?? 0;
    const pago = pagarIpi(fim);
    expect(pago.ipiAPagarCentavos).toBe(0);
    expect(razaoDaConta(pago.contabil, "2.1.6")?.ladoDoSaldo).toBeNull();
    expect(razaoDaConta(pago.contabil, CONTAS.bancos)?.saldoCentavos).toBe(bancosAntes - 13_000);
  });
});

describe("comentários do contador para os erros das operações novas", () => {
  const conferir = (id: string, informado: readonly Partida[]) => {
    const estado = antesDe(id);
    return conferirLancamento(estado.contabil, operacaoDe(estado, id), informado, estado.data);
  };

  it("devolução de compra como receita, ou sem estornar o ICMS (R-DVC-01)", () => {
    const comoReceita = conferir("m008-devolucao-compra", [
      D(CONTAS.fornecedores, "400,00"),
      C(CONTAS.receita, "400,00"),
    ]);
    expect(comoReceita.regras).toEqual(["R-DVC-01"]);
    expect(comoReceita.comentario).toMatch(/não é receita/);

    const semIcms = conferir("m008-devolucao-compra", [
      D(CONTAS.fornecedores, "400,00"),
      C(CONTAS.estoqueInsumos, "400,00"),
    ]);
    expect(semIcms.regras).toEqual(["R-DVC-01"]);
    expect(semIcms.comentario).toMatch(/estornar o ICMS/);
  });

  it("abatimento de compra como receita (R-ABC-01)", () => {
    const conferencia = conferir("m008-abatimento-compra", [
      D(CONTAS.fornecedores, "100,00"),
      C(CONTAS.descontosObtidos, "100,00"),
    ]);
    expect(conferencia.regras).toEqual(["R-ABC-01"]);
  });

  it("desconto financeiro levado ao estoque em vez de receita financeira (R-DSC-02)", () => {
    const conferencia = conferir("m006-pagamento-fornecedor", [
      D(CONTAS.fornecedores, "6.000,00"),
      C(CONTAS.bancos, "5.880,00"),
      C(CONTAS.estoqueInsumos, "120,00"),
    ]);
    expect(conferencia.regras).toEqual(["R-DSC-02"]);
    expect(conferencia.comentario).toMatch(/receita financeira/);
  });

  it("material de consumo com crédito de ICMS (R-MCO-01)", () => {
    const conferencia = conferir("m008-material-de-limpeza", [
      D(CONTAS.materialDeConsumo, "410,00"),
      D(CONTAS.icmsARecuperar, "90,00"),
      C(CONTAS.caixa, "500,00"),
    ]);
    expect(conferencia.regras).toEqual(["R-MCO-01"]);
  });

  it("devolução de venda abatida direto da receita (R-DVV-01)", () => {
    const conferencia = conferir("m009-devolucao-venda", [
      D(CONTAS.receita, "108,00"),
      C(CONTAS.clientes, "108,00"),
    ]);
    expect(conferencia.regras).toEqual(["R-DVV-01"]);
  });

  it("abatimento de venda como despesa (R-ABV-01)", () => {
    const conferencia = conferir("m009-abatimento-venda", [
      D(CONTAS.despesaSalarios, "100,00"),
      C(CONTAS.clientes, "100,00"),
    ]);
    expect(conferencia.regras).toEqual(["R-ABV-01"]);
  });

  it("IPI recuperável deixado no custo, e IPI da venda tratado como receita", () => {
    const naCompra = conferir("m010-embalagens", [
      D(CONTAS.estoqueInsumos, "348,00"),
      D(CONTAS.icmsARecuperar, "72,00"),
      C(CONTAS.fornecedores, "420,00"),
    ]);
    expect(naCompra.regras).toEqual(["R-IPI-04"]);

    const naVenda = conferir("m010-venda-congelado", [
      D(CONTAS.clientes, "3.150,00"),
      C(CONTAS.receita, "3.150,00"),
    ]);
    expect(naVenda.regras).toEqual(["R-IPI-05"]);
    expect(naVenda.comentario).toMatch(/por fora/);
  });

  it("produção lançada como custo do período (R-PRD-01)", () => {
    const conferencia = conferir("m010-producao", [
      D("4.1.2", "1.185,27"),
      C(CONTAS.estoqueInsumos, "1.185,27"),
    ]);
    expect(conferencia.regras).toEqual(["R-PRD-01"]);
  });
});
