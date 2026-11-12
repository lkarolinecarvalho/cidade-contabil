import { type Afirmativa, carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import {
  LIMITE_NA_REVISAO,
  selecionarAfirmativas,
  selecionarParaRevisao,
} from "../orquestrador/afirmativas";
import { somarDias } from "./calendario";
import { atualizarEstudo, conceitoVencido, diasAteARevisao, INTERVALOS_EM_DIAS } from "./estudo";
import {
  definirModoBanca,
  type EstadoDoJogo,
  novoJogo,
  PONTOS_POR_AFIRMATIVA,
  type Resposta,
  registrarResposta,
} from "./jogo";

const conteudo = carregarConteudoDoJogo();
const hoje = { ano: 1, mes: 1, dia: 1 };
const dia = (d: number) => ({ ano: 1, mes: 1, dia: d });

const missao = (id: string) => {
  const m = conteudo.missoes.find((x) => x.id === id);
  if (!m) throw new Error(`Missão não encontrada: ${id}`);
  return m;
};
const doConceito = (conceito: string): Afirmativa => {
  const a = conteudo.afirmativas.find((x) => x.conceitoId === conceito);
  if (!a) throw new Error(`Sem afirmativa para ${conceito}`);
  return a;
};
const certa = (a: Afirmativa): Resposta => a.gabarito;
const errada = (a: Afirmativa): Resposta => (a.gabarito === "C" ? "E" : "C");
const noDia = (estado: EstadoDoJogo, d: number): EstadoDoJogo => ({ ...estado, data: dia(d) });

describe("caixas de Leitner", () => {
  it("conceito novo começa na caixa 1 e está vencido", () => {
    expect(conceitoVencido(undefined, hoje)).toBe(true);
    expect(INTERVALOS_EM_DIAS).toEqual([0, 1, 3, 7, 15]);
  });

  it("cada acerto sobe uma caixa e espaça a próxima cobrança: 1, 3, 7 e 15 dias", () => {
    let estudo = atualizarEstudo(undefined, "acerto", hoje, false);
    const historico = [[estudo.caixa, diasAteARevisao(estudo, hoje)]];
    for (let i = 0; i < 4; i++) {
      estudo = atualizarEstudo(estudo, "acerto", hoje, false);
      historico.push([estudo.caixa, diasAteARevisao(estudo, hoje)]);
    }
    // A caixa 5 é o teto.
    expect(historico).toEqual([
      [2, 1],
      [3, 3],
      [4, 7],
      [5, 15],
      [5, 15],
    ]);
    expect(estudo.acertos).toBe(5);
  });

  it("um erro devolve o conceito para a caixa 1, vencido na hora", () => {
    let estudo = atualizarEstudo(undefined, "acerto", hoje, false);
    estudo = atualizarEstudo(estudo, "acerto", hoje, false);
    expect(estudo.caixa).toBe(3);
    estudo = atualizarEstudo(estudo, "erro", hoje, false);
    expect(estudo.caixa).toBe(1);
    expect(conceitoVencido(estudo, hoje)).toBe(true);
    expect(estudo.erros).toBe(1);
  });

  it("conceito espaçado só vence na data de revisão", () => {
    const estudo = atualizarEstudo(undefined, "acerto", hoje, false); // caixa 2: 1 dia
    expect(conceitoVencido(estudo, hoje)).toBe(false);
    expect(conceitoVencido(estudo, somarDias(hoje, 1))).toBe(true);
  });
});

describe("aceite do M7: errar faz o conceito voltar; acertos o espaçam", () => {
  const afirmativa = doConceito("capital-a-integralizar");
  const m = missao("m003-integralizacao-final");
  const selecionadas = (estado: EstadoDoJogo) =>
    selecionarAfirmativas(m, conteudo.afirmativas, estado).map((a) => a.conceitoId);

  it("depois de um erro, o conceito volta na próxima oportunidade, com outra redação", () => {
    const estado = registrarResposta(novoJogo(), afirmativa, errada(afirmativa));
    expect(estado.estudo["capital-a-integralizar"]?.caixa).toBe(1);
    const [deNovo] = selecionarAfirmativas(m, conteudo.afirmativas, estado);
    expect(deNovo?.conceitoId).toBe("capital-a-integralizar");
    expect(deNovo?.id).not.toBe(afirmativa.id);
    // E aparece na Revisão.
    expect(selecionarParaRevisao(conteudo.afirmativas, estado, 1).map((a) => a.conceitoId)).toEqual(
      ["capital-a-integralizar"],
    );
  });

  it("depois de um acerto, o conceito some e só volta quando o intervalo passa", () => {
    let estado = registrarResposta(novoJogo(), afirmativa, certa(afirmativa));
    expect(estado.pontos).toBe(PONTOS_POR_AFIRMATIVA);
    // Mesmo dia: a operação termina sem afirmativa.
    expect(selecionadas(estado)).toEqual([]);
    expect(selecionarParaRevisao(conteudo.afirmativas, estado, 1)).toEqual([]);
    // Caixa 2: volta depois de 1 dia.
    expect(selecionadas(noDia(estado, 2))).toEqual(["capital-a-integralizar"]);

    // Segundo acerto, no dia 2: caixa 3, volta só depois de 3 dias.
    estado = registrarResposta(noDia(estado, 2), afirmativa, certa(afirmativa));
    expect(selecionadas(noDia(estado, 4))).toEqual([]);
    expect(selecionadas(noDia(estado, 5))).toEqual(["capital-a-integralizar"]);

    // Terceiro acerto, no dia 5: caixa 4, volta só depois de 7 dias.
    estado = registrarResposta(noDia(estado, 5), afirmativa, certa(afirmativa));
    expect(selecionadas(noDia(estado, 11))).toEqual([]);
    expect(selecionadas(noDia(estado, 12))).toEqual(["capital-a-integralizar"]);
  });

  it("entre conceitos vencidos, a caixa mais baixa vem primeiro", () => {
    const compra = missao("m004-compra-avista"); // custo-aquisicao, ipi-no-custo-comercio, icms-a-recuperar
    const custo = doConceito("custo-aquisicao");
    const porDentro = doConceito("ipi-no-custo-comercio");
    // custo-aquisicao acertado duas vezes (caixa 3); ipi-no-custo-comercio errado (caixa 1).
    let estado = registrarResposta(novoJogo(), custo, certa(custo));
    estado = registrarResposta(estado, custo, certa(custo));
    estado = registrarResposta(estado, porDentro, errada(porDentro));
    // No dia 10 os três estão vencidos; o limite é 2.
    const escolhidos = selecionarAfirmativas(compra, conteudo.afirmativas, noDia(estado, 10)).map(
      (a) => a.conceitoId,
    );
    expect(escolhidos).toEqual(["ipi-no-custo-comercio", "icms-a-recuperar"]);
  });

  it("a Revisão só cobra conceitos já encontrados, respeita o nível e o limite", () => {
    expect(selecionarParaRevisao(conteudo.afirmativas, novoJogo(), 4)).toEqual([]);
    let estado = novoJogo();
    for (const conceito of conteudo.conceitos) {
      const a = doConceito(conceito.id);
      estado = registrarResposta(estado, a, errada(a));
    }
    const bateria = selecionarParaRevisao(conteudo.afirmativas, estado, 4);
    expect(bateria).toHaveLength(LIMITE_NA_REVISAO);
    expect(new Set(bateria.map((a) => a.conceitoId)).size).toBe(LIMITE_NA_REVISAO);
    expect(bateria.every((a) => a.momentos.includes("revisao"))).toBe(true);
    // No nível 1, só entram afirmativas liberadas para o nível 1.
    const nivel1 = selecionarParaRevisao(conteudo.afirmativas, estado, 1, 99);
    expect(nivel1.length).toBeGreaterThan(0);
    expect(nivel1.every((a) => a.nivelMin === 1)).toBe(true);
  });
});

describe("aceite do M7: o modo banca pontua +1 / −1 / 0", () => {
  const a = doConceito("capital-a-integralizar");
  const banca = () => definirModoBanca(novoJogo(), true);

  it("vem desligado: acerto dá pontos, erro não tira nada", () => {
    expect(novoJogo().modoBanca).toBe(false);
    const comErro = registrarResposta(novoJogo(), a, errada(a));
    expect(comErro.pontos).toBe(0);
    expect(comErro.placarBanca).toBe(0);
    expect(comErro.estudo[a.conceitoId]?.saldoBanca).toBe(0);
  });

  it("ligado: acerto +1, erro −1, branco 0, no placar da sessão e no do conceito", () => {
    let estado = registrarResposta(banca(), a, certa(a));
    expect(estado.placarBanca).toBe(1);
    estado = registrarResposta(estado, a, certa(a));
    expect(estado.placarBanca).toBe(2);
    estado = registrarResposta(estado, a, null);
    expect(estado.placarBanca).toBe(2);
    estado = registrarResposta(estado, a, errada(a));
    estado = registrarResposta(estado, a, errada(a));
    estado = registrarResposta(estado, a, errada(a));
    expect(estado.placarBanca).toBe(-1);
    expect(estado.estudo[a.conceitoId]).toMatchObject({
      acertos: 2,
      erros: 3,
      brancos: 1,
      saldoBanca: -1,
    });
    // No modo banca, os pontos normais não mudam.
    expect(estado.pontos).toBe(0);
  });

  it("não muda a repetição espaçada: branco conta como não sei e volta para a caixa 1", () => {
    let estado = registrarResposta(banca(), a, certa(a));
    estado = registrarResposta(estado, a, certa(a));
    expect(estado.estudo[a.conceitoId]?.caixa).toBe(3);
    estado = registrarResposta(estado, a, null);
    expect(estado.estudo[a.conceitoId]?.caixa).toBe(1);

    // As caixas andam igual com o modo ligado ou desligado.
    const sequencia: Resposta[] = [certa(a), certa(a), errada(a), certa(a)];
    const caixas = (inicial: EstadoDoJogo) =>
      sequencia.reduce((e, r) => registrarResposta(e, a, r), inicial).estudo[a.conceitoId]?.caixa;
    expect(caixas(banca())).toBe(caixas(novoJogo()));
  });
});
