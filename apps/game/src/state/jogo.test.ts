import { carregarConteudoDoJogo } from "@cidade/content";
import { balancete, ErroDeOperacao } from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import {
  CARTEIRA_INICIAL,
  concluirMissao,
  disponibilidadesDaEmpresa,
  ErroDeJogo,
  type EstadoDoJogo,
  executarOperacao,
  executarProximaOperacao,
  irParaOUltimoDia,
  jogarMissaoInteira,
  nivelDoJogador,
  novoJogo,
  operacoesExecutadas,
  proximaMissao,
  temPontoComercial,
} from "./jogo";

const { missoes } = carregarConteudoDoJogo();

const missao = (id: string) => {
  const encontrada = missoes.find((m) => m.id === id);
  if (!encontrada) throw new Error(`Missão não encontrada: ${id}`);
  return encontrada;
};

/** Joga a campanha até a missão informada, inclusive. */
function jogarAte(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of missoes) {
    estado = jogarMissaoInteira(estado, m);
    if (m.id === id) return estado;
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

describe("estado do jogo", () => {
  it("começa com a carteira do avatar, a empresa vazia e nenhum ponto", () => {
    const estado = novoJogo();
    expect(estado.carteiraCentavos).toBe(10_000_000);
    expect(estado.contabil.lancamentos).toEqual([]);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(0);
    expect(estado.pontos).toBe(0);
    expect(nivelDoJogador(estado, missoes)).toBe(1);
  });

  it("a subscrição não mexe na carteira nem no caixa da empresa", () => {
    const estado = jogarAte("m001-constituicao");
    expect(estado.carteiraCentavos).toBe(CARTEIRA_INICIAL);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(0);
    expect(estado.participacoes).toEqual({ avatar: 9000, osvaldo: 1000 });
  });

  it("R-ENT-02: na integralização a carteira cai pela parte do avatar e a empresa recebe o total", () => {
    const estado = jogarAte("m001-integralizacao");
    // R$ 80.000,00 integralizados: R$ 72.000,00 do avatar, R$ 8.000,00 do sócio.
    expect(estado.carteiraCentavos).toBe(2_800_000);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(8_000_000);
  });

  it("o HUD reflete o razão: disponibilidades = Caixa + Bancos do balancete", () => {
    const estado = jogarAte("m005-venda-avista");
    const linhas = balancete(estado.contabil).linhas;
    const saldoDe = (nome: string) =>
      linhas.find((l) => l.nome === nome)?.saldoDevedorCentavos ?? 0;
    expect(saldoDe("Caixa")).toBe(720_000);
    expect(saldoDe("Bancos Conta Movimento")).toBe(2_044_000);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(2_764_000);
  });

  it("R-ENT-01: a carteira pessoal nunca aparece no razão", () => {
    const estado = jogarAte("m007-apuracao-icms");
    expect(estado.carteiraCentavos).toBe(1_000_000);

    // Nenhuma conta do plano representa a carteira.
    const contas = estado.contabil.planoDeContas.contas;
    expect(contas.some((c) => /carteira|pessoal|sócio/i.test(c.nome))).toBe(false);

    // O razão é o mesmo com qualquer carteira: nada do estado contábil depende dela.
    let rico = { ...novoJogo(), carteiraCentavos: 99_000_000 };
    for (const m of missoes) rico = jogarMissaoInteira(rico, m);
    expect(rico.contabil).toEqual(estado.contabil);

    // O que saiu da carteira é só a parte do avatar no capital integralizado.
    expect(CARTEIRA_INICIAL - estado.carteiraCentavos).toBe(9_000_000);
    // O estado contábil não guarda a carteira em lugar nenhum.
    expect(JSON.stringify(estado.contabil)).not.toMatch(/carteira/i);
  });

  it("carteira insuficiente bloqueia a integralização, sem alterar nada", () => {
    const pobre = { ...jogarAte("m001-constituicao"), carteiraCentavos: 100 };
    expect(() => jogarMissaoInteira(pobre, missao("m001-integralizacao"))).toThrow(ErroDeJogo);
    expect(pobre.contabil.lancamentos).toHaveLength(1);
  });

  it("erro contábil do motor é propagado e o estado não muda", () => {
    const estado = jogarAte("m001-integralizacao");
    expect(() =>
      executarOperacao(estado, {
        tipo: "pagamento",
        obrigacao: "fornecedores",
        valorCentavos: 100,
        meio: "bancos",
      }),
    ).toThrow(ErroDeOperacao);
  });

  it("a próxima missão e o nível acompanham o progresso", () => {
    // A campanha começa pelas conversas com a Marta; o primeiro lançamento vem depois.
    expect(proximaMissao(novoJogo(), missoes)?.id).toBe("m000-apresentacao");
    expect(proximaMissao(jogarAte("m000-para-que-serve"), missoes)?.id).toBe("m001-constituicao");
    const noCapitulo2 = jogarAte("m003-equipamentos");
    expect(proximaMissao(noCapitulo2, missoes)?.id).toBe("m004-compra-avista");
    expect(nivelDoJogador(noCapitulo2, missoes)).toBe(2);
    const fim = jogarAte("m007-apuracao-icms");
    expect(proximaMissao(fim, missoes)).toBeUndefined();
    expect(nivelDoJogador(fim, missoes)).toBe(5);
  });

  it("o ponto da praça só é da empresa depois da compra do imóvel", () => {
    expect(temPontoComercial(novoJogo().contabil)).toBe(false);
    expect(temPontoComercial(jogarAte("m001-integralizacao").contabil)).toBe(false);
    expect(temPontoComercial(jogarAte("m002-compra-imovel").contabil)).toBe(true);
  });

  it("a empresa do jogo é a hamburgueria: o hambúrguer baixa os insumos da receita", () => {
    const antes = jogarAte("m004-compra-prazo");
    const depois = jogarAte("m005-venda-avista");
    for (const insumo of ["pao", "carne", "queijo", "alface"]) {
      expect(antes.contabil.estoque[insumo]?.quantidade, insumo).toBe(1000);
      expect(depois.contabil.estoque[insumo]?.quantidade, insumo).toBe(700);
    }
    expect(depois.contabil.estoque.refrigerante?.quantidade).toBe(300);
  });
});

describe("andamento da missão", () => {
  it("operação sem lançamento gasta uma ação, muda o controle e não toca o razão (R-CSG-01)", () => {
    const consignacao = missao("m009-consignacao");
    const antes = jogarAte("m009-receber-antes");
    const depois = executarProximaOperacao(antes, consignacao);
    expect(depois.contabil.lancamentos).toEqual(antes.contabil.lancamentos);
    expect(depois.contabil.consignado.refrigerante?.quantidade).toBe(300);
    expect(depois.acoesUsadasHoje).toBe(antes.acoesUsadasHoje + 1);

    const concluida = concluirMissao(depois, consignacao);
    expect(concluida.pontos).toBe(antes.pontos + consignacao.recompensa.pontos);
    expect(concluida.missoesConcluidas).toContain(consignacao.id);
  });

  it("grava uma operação por vez e lembra onde parou", () => {
    const fechamento = missao("m007-depreciacao");
    const antes = irParaOUltimoDia(jogarAte("m010-venda-congelado"));
    expect(operacoesExecutadas(antes, fechamento)).toBe(0);

    // Primeira operação: a depreciação, um lançamento por classe de bem.
    const comDepreciacao = executarProximaOperacao(antes, fechamento);
    expect(operacoesExecutadas(comDepreciacao, fechamento)).toBe(1);
    expect(comDepreciacao.contabil.lancamentos.length).toBe(antes.contabil.lancamentos.length + 3);
    // Ainda falta o inventário: a missão não pode ser concluída.
    expect(() => concluirMissao(comDepreciacao, fechamento)).toThrow(/operações dessa missão/);

    // Segunda operação: o inventário do material de consumo. Não repete a primeira.
    const comInventario = executarProximaOperacao(comDepreciacao, fechamento);
    expect(comInventario.contabil.lancamentos.length).toBe(antes.contabil.lancamentos.length + 4);
    expect(() => executarProximaOperacao(comInventario, fechamento)).toThrow(/já foram feitas/);

    const concluida = concluirMissao(comInventario, fechamento);
    expect(concluida.andamento).toBeNull();
    expect(concluida.missoesConcluidas).toContain(fechamento.id);
    expect(concluida.contabil).toEqual(jogarAte("m007-depreciacao").contabil);
  });

  it("a conversa com a contadora não gasta ação nem mexe no razão, e vale pontos", () => {
    const conversa = missao("m000-apresentacao");
    expect(conversa.operacoes).toEqual([]);
    const inicio = novoJogo();
    const depois = concluirMissao(inicio, conversa);
    expect(depois.contabil).toEqual(inicio.contabil);
    expect(depois.acoesUsadasHoje).toBe(inicio.acoesUsadasHoje);
    expect(depois.carteiraCentavos).toBe(inicio.carteiraCentavos);
    expect(depois.pontos).toBe(conversa.recompensa.pontos);
    expect(depois.missoesConcluidas).toEqual(["m000-apresentacao"]);
    // Sem as conversas, o contrato social ainda não está disponível.
    expect(() => executarProximaOperacao(inicio, missao("m001-constituicao"))).toThrow(
      /anteriores/,
    );
  });

  it("respeita requisitos e não repete missão concluída", () => {
    const primeira = missao("m001-constituicao");
    const estado = jogarMissaoInteira(jogarAte("m000-para-que-serve"), primeira);
    expect(() => concluirMissao(estado, primeira)).toThrow(/já foi concluída/);
    expect(() => executarProximaOperacao(novoJogo(), missao("m002-compra-imovel"))).toThrow(
      /anteriores/,
    );
  });
});
