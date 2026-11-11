import { carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import {
  avancar,
  destinoDoToque,
  EDIFICIO,
  EDIFICIOS,
  edificioNoPonto,
  edificioPorId,
  MUNDO,
  POSICAO_INICIAL,
  RUA,
  rotaAte,
} from "./mapa";

describe("mapa da cidade", () => {
  it("tem exatamente os 6 estabelecimentos do conteúdo", () => {
    const doConteudo = carregarConteudoDoJogo().estabelecimentos.map((e) => e.id);
    expect(EDIFICIOS.map((e) => e.id).sort()).toEqual([...doConteudo].sort());
  });

  it("os edifícios cabem no mundo, não se sobrepõem e não invadem a rua", () => {
    for (const e of EDIFICIOS) {
      expect(e.centro.x - EDIFICIO.largura / 2).toBeGreaterThanOrEqual(0);
      expect(e.centro.x + EDIFICIO.largura / 2).toBeLessThanOrEqual(MUNDO.largura);
      const distanciaDaRua = Math.abs(e.centro.x - RUA.x) - EDIFICIO.largura / 2;
      expect(distanciaDaRua).toBeGreaterThanOrEqual(RUA.largura / 2);
      for (const outro of EDIFICIOS) {
        if (outro === e) continue;
        const separados =
          Math.abs(e.centro.x - outro.centro.x) >= EDIFICIO.largura ||
          Math.abs(e.centro.y - outro.centro.y) >= EDIFICIO.altura;
        expect(separados, `${e.id} x ${outro.id}`).toBe(true);
      }
    }
  });

  it("toda porta fica fora do edifício, na calçada ligada à rua", () => {
    for (const e of EDIFICIOS) {
      expect(edificioNoPonto(e.porta), e.id).toBeUndefined();
      // A porta fica na base da fachada, virada para o jogador.
      expect(e.porta.x).toBe(e.centro.x);
      expect(e.porta.y).toBeGreaterThan(e.centro.y + EDIFICIO.altura / 2);
      expect(e.porta.y).toBeGreaterThanOrEqual(RUA.yMin);
      expect(e.porta.y).toBeLessThanOrEqual(RUA.yMax);
    }
  });

  it("tocar num edifício leva à porta dele", () => {
    const banco = edificioPorId("banco");
    expect(banco).toBeDefined();
    const destino = destinoDoToque({
      x: (banco?.centro.x ?? 0) + 20,
      y: (banco?.centro.y ?? 0) - 30,
    });
    expect(destino).toMatchObject({ tipo: "estabelecimento", edificio: { id: "banco" } });
    expect(destino.ponto).toEqual(banco?.porta);
  });

  it("tocar fora dos edifícios leva ao ponto mais próximo da rua", () => {
    expect(destinoDoToque({ x: 12, y: 336 })).toEqual({ tipo: "rua", ponto: { x: RUA.x, y: 336 } });
    expect(destinoDoToque({ x: 200, y: 5 }).ponto).toEqual({ x: RUA.x, y: RUA.yMin });
    expect(destinoDoToque({ x: 200, y: 9999 }).ponto).toEqual({ x: RUA.x, y: RUA.yMax });
  });
});

describe("rota do avatar", () => {
  const porta = (id: string) => {
    const e = edificioPorId(id);
    if (!e) throw new Error(`Edifício não encontrado: ${id}`);
    return e.porta;
  };

  /** Pontos intermediários do trajeto, de 1 em 1 unidade. */
  function trajeto(origem: { x: number; y: number }, destino: { x: number; y: number }) {
    const pontos = [];
    let passo = {
      posicao: origem,
      rota: rotaAte(origem, destino) as readonly { x: number; y: number }[],
    };
    for (let i = 0; i < 5000 && passo.rota.length > 0; i++) {
      passo = avancar(passo.posicao, passo.rota, 1);
      pontos.push(passo.posicao);
    }
    return pontos;
  }

  it("da posição inicial chega a todas as portas sem atravessar nenhum edifício", () => {
    for (const e of EDIFICIOS) {
      const pontos = trajeto(POSICAO_INICIAL, e.porta);
      expect(pontos.at(-1), e.id).toEqual(e.porta);
      expect(
        pontos.some((p) => edificioNoPonto(p)),
        e.id,
      ).toBe(false);
    }
  });

  it("de qualquer porta chega a qualquer outra sem atravessar edifícios", () => {
    for (const de of EDIFICIOS) {
      for (const para of EDIFICIOS) {
        const pontos = trajeto(de.porta, para.porta);
        if (de === para) {
          expect(pontos).toEqual([]);
          continue;
        }
        expect(pontos.at(-1), `${de.id} → ${para.id}`).toEqual(para.porta);
        expect(
          pontos.some((p) => edificioNoPonto(p)),
          `${de.id} → ${para.id}`,
        ).toBe(false);
      }
    }
  });

  it("vai pela rua central: sai da calçada, anda na rua, entra na outra calçada", () => {
    expect(rotaAte(porta("escritorio-contabil"), porta("minha-loja"))).toEqual([
      { x: RUA.x, y: porta("escritorio-contabil").y },
      { x: RUA.x, y: porta("minha-loja").y },
      porta("minha-loja"),
    ]);
    // Vizinhos de frente: basta atravessar a rua.
    expect(rotaAte(porta("escritorio-contabil"), porta("banco"))).toEqual([porta("banco")]);
  });

  it("avancar anda a distância pedida e para exatamente no destino", () => {
    const rota = [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(avancar({ x: 0, y: 0 }, rota, 4)).toEqual({ posicao: { x: 4, y: 0 }, rota });
    // Dobra a esquina no mesmo passo.
    expect(avancar({ x: 0, y: 0 }, rota, 15)).toEqual({
      posicao: { x: 10, y: 5 },
      rota: [{ x: 10, y: 10 }],
    });
    expect(avancar({ x: 0, y: 0 }, rota, 999)).toEqual({ posicao: { x: 10, y: 10 }, rota: [] });
    expect(avancar({ x: 3, y: 3 }, [], 50)).toEqual({ posicao: { x: 3, y: 3 }, rota: [] });
  });
});
