import { carregarConteudoDoJogo } from "@cidade/content";
import { balanco, dre, ErroDeOperacao } from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import {
  ACOES_POR_DIA,
  baixarTitulos,
  compararDatas,
  situacaoDoTitulo,
  somarDias,
  type Titulo,
  titulosEmAberto,
  titulosEmAlerta,
} from "./calendario";
import {
  acoesRestantes,
  concluirMissao,
  type EstadoDoJogo,
  encerrarDia,
  executarProximaOperacao,
  fecharMes,
  irParaOUltimoDia,
  jogarMissaoInteira,
  liquidarTitulo,
  mesFechado,
  missaoDisponivelHoje,
  novoJogo,
  pagarIcms,
} from "./jogo";

const { missoes } = carregarConteudoDoJogo();
const missao = (id: string) => {
  const encontrada = missoes.find((m) => m.id === id);
  if (!encontrada) throw new Error(`Missão não encontrada: ${id}`);
  return encontrada;
};
const dia = (d: number, mes = 1, ano = 1) => ({ ano, mes, dia: d });

function jogarAte(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of missoes) {
    estado = jogarMissaoInteira(estado, m);
    if (m.id === id) return estado;
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

const saldo = (estado: EstadoDoJogo, nome: string): number => {
  const bp = balanco(estado.contabil, estado.data);
  return (
    [...bp.ativo.circulante, ...bp.passivo.circulante].find((l) => l.nome === nome)
      ?.valorCentavos ?? 0
  );
};

describe("datas do jogo (meses de 30 dias)", () => {
  it("soma dias atravessando meses e anos", () => {
    expect(somarDias(dia(1), 1)).toEqual(dia(2));
    expect(somarDias(dia(30), 1)).toEqual(dia(1, 2));
    expect(somarDias(dia(4), 30)).toEqual(dia(4, 2));
    expect(somarDias(dia(30, 12), 1)).toEqual(dia(1, 1, 2));
    expect(somarDias(dia(15, 11), 90)).toEqual(dia(15, 2, 2));
  });

  it("compara datas", () => {
    expect(compararDatas(dia(5), dia(5))).toBe(0);
    expect(compararDatas(dia(30), dia(1, 2))).toBeLessThan(0);
    expect(compararDatas(dia(1, 1, 2), dia(30, 12))).toBeGreaterThan(0);
  });
});

describe("títulos e vencimentos", () => {
  const titulo = (
    id: number,
    tipo: Titulo["tipo"],
    valor: number,
    vencimento = dia(10),
  ): Titulo => ({
    id,
    tipo,
    descricao: "x",
    valorCentavos: valor,
    saldoCentavos: valor,
    emissao: dia(1),
    vencimento,
  });

  it("classifica o título pelo vencimento e alerta os que vencem hoje ou já venceram", () => {
    const t = titulo(1, "pagar", 100);
    expect(situacaoDoTitulo(t, dia(9))).toBe("a_vencer");
    expect(situacaoDoTitulo(t, dia(10))).toBe("vence_hoje");
    expect(situacaoDoTitulo(t, dia(11))).toBe("vencido");
    expect(titulosEmAlerta([t], dia(9))).toEqual([]);
    expect(titulosEmAlerta([t], dia(10))).toEqual([t]);
    expect(titulosEmAlerta([{ ...t, saldoCentavos: 0 }], dia(20))).toEqual([]);
  });

  it("baixa pelo vencimento mais próximo, só nos títulos do tipo", () => {
    const titulos = [
      titulo(1, "pagar", 500, dia(20)),
      titulo(2, "receber", 900, dia(5)),
      titulo(3, "pagar", 300, dia(10)),
    ];
    const depois = baixarTitulos(titulos, "pagar", 400);
    expect(depois.map((t) => t.saldoCentavos)).toEqual([400, 900, 0]);
    expect(titulosEmAberto(depois).map((t) => t.id)).toEqual([2, 1]);
  });

  it("compra a prazo cria título; devolução, abatimento e pagamento baixam o saldo", () => {
    const comCompra = jogarAte("m004-compra-prazo");
    expect(comCompra.titulos).toMatchObject([
      { tipo: "pagar", valorCentavos: 650_000, saldoCentavos: 650_000 },
    ]);
    const [aPagar] = comCompra.titulos;
    expect(aPagar && compararDatas(aPagar.vencimento, somarDias(aPagar.emissao, 30))).toBe(0);

    // A devolução de 400,00 e o abatimento de 100,00 reduzem o que se deve da nota c1.
    expect(jogarAte("m008-abatimento-compra").titulos).toMatchObject([
      { tipo: "pagar", valorCentavos: 650_000, saldoCentavos: 600_000 },
    ]);
    // O pagamento antecipado quita a nota c1; a nota c2 continua em aberto.
    expect(jogarAte("m006-pagamento-fornecedor").titulos).toMatchObject([
      { tipo: "pagar", saldoCentavos: 0 },
      { tipo: "pagar", valorCentavos: 180_000, saldoCentavos: 180_000 },
    ]);
  });

  it("venda a prazo cria título pelo total da nota, com o desconto e o IPI", () => {
    const aReceber = (estado: EstadoDoJogo) => estado.titulos.filter((t) => t.tipo === "receber");
    // Nota v1: 4.600,00 menos 10% de desconto.
    expect(aReceber(jogarAte("m005-venda-prazo"))).toMatchObject([
      { valorCentavos: 414_000, saldoCentavos: 414_000 },
    ]);
    // Devolução de 108,00 e abatimento de 100,00; depois, o recebimento antecipado.
    expect(aReceber(jogarAte("m009-abatimento-venda"))).toMatchObject([{ saldoCentavos: 393_200 }]);
    expect(aReceber(jogarAte("m009-receber-antes"))).toMatchObject([{ saldoCentavos: 0 }]);
    // Nota v2: 3.000,00 mais 150,00 de IPI por fora.
    expect(aReceber(jogarAte("m010-venda-congelado")).at(-1)).toMatchObject({
      valorCentavos: 315_000,
    });
  });

  it("a venda do consignado cria a dívida com o consignante", () => {
    const antes = jogarAte("m009-consignacao");
    const depois = jogarAte("m009-venda-consignada");
    expect(depois.titulos).toHaveLength(antes.titulos.length + 1);
    expect(depois.titulos.at(-1)).toMatchObject({
      tipo: "pagar",
      descricao: "Consignante",
      valorCentavos: 45_000,
    });
  });
});

describe("dias e ações", () => {
  it("cada operação gasta uma ação; sem ações, só encerrando o dia", () => {
    let estado = novoJogo();
    expect(acoesRestantes(estado)).toBe(ACOES_POR_DIA);
    estado = executarProximaOperacao(estado, missao("m001-constituicao"));
    expect(acoesRestantes(estado)).toBe(ACOES_POR_DIA - 1);

    const semAcoes = { ...estado, acoesUsadasHoje: ACOES_POR_DIA };
    const proxima = concluirMissao(semAcoes, missao("m001-constituicao"));
    expect(() => executarProximaOperacao(proxima, missao("m001-integralizacao"))).toThrow(
      /ações de hoje/,
    );
    const amanha = encerrarDia(proxima);
    expect(amanha.data).toEqual(dia(2));
    expect(acoesRestantes(amanha)).toBe(ACOES_POR_DIA);
    expect(() => executarProximaOperacao(amanha, missao("m001-integralizacao"))).not.toThrow();
  });

  it("o fechamento só pode ser feito no último dia do mês", () => {
    const estado = jogarAte("m010-venda-congelado");
    const depreciacao = missao("m007-depreciacao");
    expect(missaoDisponivelHoje(depreciacao, estado.data)).toBe(false);
    expect(() => executarProximaOperacao(estado, depreciacao)).toThrow(/último dia/);
    const noFim = irParaOUltimoDia(estado);
    expect(noFim.data).toEqual(dia(30));
    expect(missaoDisponivelHoje(depreciacao, noFim.data)).toBe(true);
    expect(() => executarProximaOperacao(noFim, depreciacao)).not.toThrow();
  });

  it("o mês não vira sem o fechamento", () => {
    const noFim = irParaOUltimoDia(jogarAte("m010-venda-congelado"));
    expect(() => encerrarDia(noFim)).toThrow(/fechamento/);
  });
});

describe("um mês completo (aceite do M6)", () => {
  const fim = jogarAte("m007-apuracao-icms");

  it("termina no dia 30, fechado, com a apuração e a DRE corretas", () => {
    expect(fim.data).toEqual(dia(30));
    expect(mesFechado(fim)).toBe(true);
    // Apuração do ICMS: compensa 1.845,00 de crédito; sobram 878,76 a pagar.
    expect(saldo(fim, "ICMS a Recuperar")).toBe(0);
    expect(saldo(fim, "ICMS a Recolher")).toBe(87_876);
    expect(fim.icmsAPagarCentavos).toBe(87_876);
    // Apuração do IPI: compensa 20,00; sobram 130,00.
    expect(saldo(fim, "IPI a Recolher")).toBe(13_000);

    const d = dre(fim.contabil, { de: dia(1), ate: dia(30) });
    expect(d.totalReceitaBrutaCentavos).toBe(1_570_000);
    expect(d.receitaLiquidaCentavos).toBe(1_185_534);
    expect(d.lucroBrutoCentavos).toBe(715_890);
    expect(d.resultadoCentavos).toBe(291_693);
    expect(balanco(fim.contabil, dia(30)).ativo.totalCentavos).toBe(11_004_859);
  });

  it("depois do fechamento o mês vira, e a DRE do mês novo começa zerada", () => {
    expect(() => fecharMes(fim)).toThrow(/já foi fechado/);
    const mes2 = encerrarDia(fim);
    expect(mes2.data).toEqual(dia(1, 2));
    expect(mesFechado(mes2)).toBe(false);
    expect(dre(mes2.contabil, { de: dia(1, 2), ate: dia(30, 2) }).resultadoCentavos).toBe(0);
  });

  it("no mês seguinte: títulos vencem, são liquidados e o mês fecha de novo", () => {
    const abertos = titulosEmAberto(fim.titulos);
    // Nota c2, o consignante e a nota c3 a pagar; a nota v2 a receber.
    expect(abertos.map((t) => [t.tipo, t.saldoCentavos]).sort()).toEqual(
      [
        ["pagar", 180_000],
        ["pagar", 45_000],
        ["pagar", 42_000],
        ["receber", 315_000],
      ].sort(),
    );
    const aReceber = abertos.find((t) => t.tipo === "receber");
    if (!aReceber) throw new Error("título a receber esperado");

    // O cliente só paga no vencimento, que cai no mês seguinte.
    expect(() => liquidarTitulo(fim, aReceber.id)).toThrow(/só paga no vencimento/);
    expect(titulosEmAlerta(fim.titulos, fim.data)).toEqual([]);
    let estado = encerrarDia(fim);
    while (compararDatas(estado.data, aReceber.vencimento) < 0) estado = encerrarDia(estado);
    expect(titulosEmAlerta(estado.titulos, estado.data).length).toBeGreaterThan(0);

    const bancosAntes = saldo(estado, "Bancos Conta Movimento");
    for (const titulo of abertos) estado = liquidarTitulo(estado, titulo.id);
    expect(saldo(estado, "Bancos Conta Movimento")).toBe(bancosAntes + 315_000 - 267_000);
    expect(saldo(estado, "Clientes")).toBe(0);
    expect(saldo(estado, "Fornecedores")).toBe(0);
    expect(titulosEmAberto(estado.titulos)).toEqual([]);
    expect(() => liquidarTitulo(estado, aReceber.id)).toThrow(/já foi quitado/);

    // Fechamento do mês 2, fora da campanha: depreciação e apurações direto pelo motor.
    expect(() => fecharMes(estado)).toThrow(/último dia/);
    estado = fecharMes(irParaOUltimoDia(estado));
    expect(mesFechado(estado)).toBe(true);
    const d = dre(estado.contabil, { de: dia(1, 2), ate: dia(30, 2) });
    expect(d.totalDespesasOperacionaisCentavos).toBe(38_333); // só a depreciação
    expect(d.resultadoCentavos).toBe(-38_333);
    expect(encerrarDia(estado).data).toEqual(dia(1, 3));
  });

  it("ICMS com saldo devedor na apuração é pago no Posto Fiscal", () => {
    expect(fim.icmsAPagarCentavos).toBe(87_876);
    const bancosAntes = saldo(fim, "Bancos Conta Movimento");
    const pago = pagarIcms(fim);
    expect(pago.icmsAPagarCentavos).toBe(0);
    expect(saldo(pago, "ICMS a Recolher")).toBe(0);
    expect(saldo(pago, "Bancos Conta Movimento")).toBe(bancosAntes - 87_876);
    expect(() => pagarIcms(pago)).toThrow(/Não há ICMS/);
  });

  it("erro contábil numa ação não gasta a ação nem muda o estado", () => {
    const estado = { ...encerrarDia(fim) };
    const [aPagar] = estado.titulos;
    if (!aPagar) throw new Error("título esperado");
    const semDinheiro: EstadoDoJogo = {
      ...estado,
      titulos: [{ ...aPagar, saldoCentavos: 999_999_999 }],
    };
    expect(() => liquidarTitulo(semDinheiro, aPagar.id)).toThrow(ErroDeOperacao);
    expect(acoesRestantes(semDinheiro)).toBe(ACOES_POR_DIA);
  });
});
