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
  jogarMissaoInteira,
  nivelDoJogador,
  novoJogo,
  operacoesExecutadas,
  PONTOS_POR_AFIRMATIVA,
  proximaMissao,
  registrarResposta,
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
    expect(estado.carteiraCentavos).toBe(28_000_000);
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
    // R$ 200.000,00 integralizados: R$ 180.000,00 do avatar, R$ 20.000,00 do NPC.
    expect(estado.carteiraCentavos).toBe(10_000_000);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(20_000_000);
  });

  it("o HUD reflete o razão: disponibilidades = Caixa + Bancos do balancete", () => {
    const estado = jogarAte("m005-venda-avista");
    const linhas = balancete(estado.contabil).linhas;
    const saldoDe = (nome: string) =>
      linhas.find((l) => l.nome === nome)?.saldoDevedorCentavos ?? 0;
    expect(saldoDe("Caixa")).toBe(50_000);
    expect(saldoDe("Bancos Conta Movimento")).toBe(6_000_000);
    expect(disponibilidadesDaEmpresa(estado.contabil)).toBe(6_050_000);
  });

  it("R-ENT-01: a carteira pessoal nunca aparece no razão", () => {
    const estado = jogarAte("m007-apuracao-icms");
    expect(estado.carteiraCentavos).toBe(1_000_000);

    // Nenhuma conta do plano representa a carteira.
    const contas = estado.contabil.planoDeContas.contas;
    expect(contas.some((c) => /carteira|pessoal|acionista/i.test(c.nome))).toBe(false);

    // O razão é o mesmo com qualquer carteira: nada do estado contábil depende dela.
    let rico = { ...novoJogo(), carteiraCentavos: 99_000_000 };
    for (const m of missoes) rico = jogarMissaoInteira(rico, m);
    expect(rico.contabil).toEqual(estado.contabil);

    // O que saiu da carteira é só a parte do avatar no capital integralizado.
    expect(CARTEIRA_INICIAL - estado.carteiraCentavos).toBe(27_000_000);
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
    expect(proximaMissao(novoJogo(), missoes)?.id).toBe("m001-capital-autorizado");
    const noCapitulo4 = jogarAte("m003-equipamentos");
    expect(proximaMissao(noCapitulo4, missoes)?.id).toBe("m004-compra-avista");
    expect(nivelDoJogador(noCapitulo4, missoes)).toBe(2);
    const fim = jogarAte("m007-apuracao-icms");
    expect(proximaMissao(fim, missoes)).toBeUndefined();
    expect(nivelDoJogador(fim, missoes)).toBe(4);
  });
});

describe("andamento da missão", () => {
  it("missão sem operação conclui direto e não gera lançamento (R-CAP-02)", () => {
    const primeira = missao("m001-capital-autorizado");
    const estado = concluirMissao(novoJogo(), primeira);
    expect(estado.pontos).toBe(primeira.recompensa.pontos);
    expect(estado.missoesConcluidas).toEqual([primeira.id]);
    expect(estado.contabil.lancamentos).toEqual([]);
  });

  it("grava uma operação por vez e lembra onde parou", () => {
    const salarios = missao("m006-salarios");
    const antes = jogarAte("m006-pagamento-fornecedor");
    expect(operacoesExecutadas(antes, salarios)).toBe(0);

    // Primeira operação: os salários do mês.
    const comProvisao = executarProximaOperacao(antes, salarios);
    expect(operacoesExecutadas(comProvisao, salarios)).toBe(1);
    expect(comProvisao.contabil.lancamentos.length).toBe(antes.contabil.lancamentos.length + 1);
    // Ainda falta o pagamento: a missão não pode ser concluída.
    expect(() => concluirMissao(comProvisao, salarios)).toThrow(/operações dessa missão/);

    // Segunda operação: o pagamento. Não repete a primeira.
    const comPagamento = executarProximaOperacao(comProvisao, salarios);
    expect(comPagamento.contabil.lancamentos.length).toBe(antes.contabil.lancamentos.length + 2);
    expect(() => executarProximaOperacao(comPagamento, salarios)).toThrow(/já foram feitas/);

    const concluida = concluirMissao(comPagamento, salarios);
    expect(concluida.andamento).toBeNull();
    expect(concluida.missoesConcluidas).toContain(salarios.id);
    expect(concluida.contabil).toEqual(jogarAte("m006-salarios").contabil);
  });

  it("respeita requisitos e não repete missão concluída", () => {
    const primeira = missao("m001-capital-autorizado");
    const estado = concluirMissao(novoJogo(), primeira);
    expect(() => concluirMissao(estado, primeira)).toThrow(/já foi concluída/);
    expect(() => executarProximaOperacao(novoJogo(), missao("m002-compra-imovel"))).toThrow(
      /anteriores/,
    );
  });

  it("resposta certa a uma afirmativa pontua; toda resposta conta como vista", () => {
    let estado = registrarResposta(novoJogo(), "af-x", true);
    estado = registrarResposta(estado, "af-x", false);
    estado = registrarResposta(estado, "af-y", false);
    expect(estado.pontos).toBe(PONTOS_POR_AFIRMATIVA);
    expect(estado.afirmativasVistas).toEqual({ "af-x": 2, "af-y": 1 });
  });
});
