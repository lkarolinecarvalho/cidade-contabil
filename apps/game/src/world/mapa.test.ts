import { carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import { ENFEITES_DO_MAPA } from "./enfeites";
import {
  avancar,
  CENTRO,
  destinoDoToque,
  EDIFICIO,
  EDIFICIOS,
  edificioNoPonto,
  edificioPorId,
  estaNoCaminho,
  LADRILHO,
  MUNDO,
  naTela,
  POSICAO_INICIAL,
  type Ponto,
  pontoNoCaminho,
  rotaAte,
  TRECHOS,
} from "./mapa";

const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

describe("mapa da cidade", () => {
  it("tem exatamente os 6 estabelecimentos do conteúdo", () => {
    const doConteudo = carregarConteudoDoJogo().estabelecimentos.map((e) => e.id);
    expect(EDIFICIOS.map((e) => e.id).sort()).toEqual([...doConteudo].sort());
  });

  it("projeta a grade em losangos de 2:1 em volta do centro da praça", () => {
    expect(naTela([0, 0])).toEqual(CENTRO);
    expect(naTela([1, 0])).toEqual({ x: CENTRO.x + LADRILHO, y: CENTRO.y + LADRILHO / 2 });
    expect(naTela([0, 1])).toEqual({ x: CENTRO.x - LADRILHO, y: CENTRO.y + LADRILHO / 2 });
  });

  it("todo trecho de caminho segue uma das duas direções da grade", () => {
    for (const [a, b] of TRECHOS) {
      const dx = Math.abs(a[0] - b[0]);
      const dy = Math.abs(a[1] - b[1]);
      const alinhado = dx < 1e-9 || dy < 1e-9;
      expect(alinhado, `${a} → ${b}`).toBe(true);
    }
  });

  it("as bases dos edifícios não se sobrepõem na grade e o centro fica dentro do mundo", () => {
    for (const e of EDIFICIOS) {
      expect(e.centro.x).toBeGreaterThan(0);
      expect(e.centro.x).toBeLessThan(MUNDO.largura);
      for (const outro of EDIFICIOS) {
        if (outro === e) continue;
        const separados =
          Math.abs(e.grade[0] - outro.grade[0]) >= EDIFICIO.lado ||
          Math.abs(e.grade[1] - outro.grade[1]) >= EDIFICIO.lado;
        expect(separados, `${e.id} x ${outro.id}`).toBe(true);
      }
    }
  });

  it("toda porta fica fora dos edifícios, sobre um caminho, do lado da fachada", () => {
    for (const e of EDIFICIOS) {
      expect(edificioNoPonto(e.porta), e.id).toBeUndefined();
      expect(estaNoCaminho(e.porta), e.id).toBe(true);
      // A fachada fica virada para o meio do mapa e para o jogador.
      expect(e.porta.y).toBeGreaterThan(e.centro.y);
      if (e.frente === "direita") expect(e.porta.x).toBeGreaterThan(e.centro.x);
      else expect(e.porta.x).toBeLessThan(e.centro.x);
    }
  });

  it("a silhueta do edifício cobre a base e as paredes, mas não a calçada da frente", () => {
    const banco = edificioPorId("banco");
    if (!banco) throw new Error("sem banco");
    const { x, y } = banco.centro;
    expect(edificioNoPonto({ x, y })?.id).toBe("banco");
    // No alto da parede, acima da base.
    expect(edificioNoPonto({ x, y: y - 60 })?.id).toBe("banco");
    expect(edificioNoPonto({ x: x + 55, y: y - 40 })?.id).toBe("banco");
    // Acima do telhado e nos cantos fora do losango.
    expect(edificioNoPonto({ x, y: y - 120 })).toBeUndefined();
    expect(edificioNoPonto({ x: x - 55, y: y + 20 })).toBeUndefined();
  });

  it("tocar num edifício leva à porta dele", () => {
    const banco = edificioPorId("banco");
    const destino = destinoDoToque({
      x: (banco?.centro.x ?? 0) + 20,
      y: (banco?.centro.y ?? 0) - 30,
    });
    expect(destino).toMatchObject({ tipo: "estabelecimento", edificio: { id: "banco" } });
    expect(destino.ponto).toEqual(banco?.porta);
  });

  it("tocar fora dos edifícios leva ao ponto mais próximo de um caminho", () => {
    // Na fonte, no meio da praça: vai para o anel em volta dela.
    for (const toque of [CENTRO, { x: 5, y: 5 }, { x: 380, y: 830 }]) {
      const destino = destinoDoToque(toque);
      expect(destino.tipo).toBe("rua");
      expect(estaNoCaminho(destino.ponto)).toBe(true);
    }
  });

  it("as silhuetas dos estabelecimentos não se cobrem na tela", () => {
    for (const e of EDIFICIOS) {
      // O centro da base e o alto da parede de um nunca caem dentro de outro.
      for (const p of [e.centro, { x: e.centro.x, y: e.centro.y - 60 }]) {
        expect(edificioNoPonto(p)?.id, e.id).toBe(e.id);
      }
    }
  });

  it("os enfeites ficam fora dos caminhos; a fonte, no centro da praça", () => {
    for (const { tipo, ponto } of ENFEITES_DO_MAPA) {
      if (tipo === "fonte") {
        expect(ponto).toEqual(CENTRO);
        continue;
      }
      const ateOCaminho = distancia(ponto, pontoNoCaminho(ponto));
      expect(ateOCaminho, `${tipo} em ${ponto.x},${ponto.y}`).toBeGreaterThan(12);
    }
  });
});

describe("rota do avatar", () => {
  const porta = (id: string) => {
    const e = edificioPorId(id);
    if (!e) throw new Error(`Edifício não encontrado: ${id}`);
    return e.porta;
  };

  /** Pontos intermediários do trajeto, de 1 em 1 unidade. */
  function trajeto(origem: Ponto, destino: Ponto) {
    const pontos = [];
    let passo = { posicao: origem, rota: rotaAte(origem, destino) as readonly Ponto[] };
    for (let i = 0; i < 5000 && passo.rota.length > 0; i++) {
      passo = avancar(passo.posicao, passo.rota, 1);
      pontos.push(passo.posicao);
    }
    return pontos;
  }

  it("a posição inicial fica sobre um caminho", () => {
    expect(estaNoCaminho(POSICAO_INICIAL)).toBe(true);
  });

  it("da posição inicial chega a todas as portas, sempre pelos caminhos", () => {
    for (const e of EDIFICIOS) {
      const pontos = trajeto(POSICAO_INICIAL, e.porta);
      expect(pontos.at(-1), e.id).toEqual(e.porta);
      expect(
        pontos.some((p) => edificioNoPonto(p)),
        e.id,
      ).toBe(false);
      expect(
        pontos.every((p) => distancia(p, pontoNoCaminho(p)) < 1e-6),
        e.id,
      ).toBe(true);
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

  it("os vizinhos de trás da praça se ligam pela borda do anel, sem dar a volta", () => {
    const rota = rotaAte(porta("escritorio-contabil"), porta("banco"));
    expect(rota).toEqual([naTela([-5, 0]), naTela([-5, -5]), naTela([-8.7, -5]), porta("banco")]);
  });

  it("contorna a fonte pelo lado mais curto do anel", () => {
    // Da Imobiliária (na frente, à esquerda) ao Posto Fiscal (atrás, à direita).
    expect(rotaAte(porta("imobiliaria"), porta("posto-fiscal"))).toEqual([
      naTela([5, 5]),
      naTela([5, -5]),
      naTela([0.5, -5]),
      porta("posto-fiscal"),
    ]);
  });

  it("a Minha Loja fica depois do Fornecedor, descendo a rua da esquina", () => {
    const rota = rotaAte(porta("escritorio-contabil"), porta("minha-loja"));
    expect(rota).toContainEqual(porta("fornecedor"));
    expect(rota.at(-2)).toEqual(naTela([20, 5]));
    expect(rota.at(-1)).toEqual(porta("minha-loja"));
  });

  it("no meio do caminho, muda de destino sem sair dos trechos", () => {
    const parcial = avancar(
      porta("escritorio-contabil"),
      rotaAte(porta("escritorio-contabil"), porta("fornecedor")),
      137,
    );
    const pontos = trajeto(parcial.posicao, porta("banco"));
    expect(pontos.at(-1)).toEqual(porta("banco"));
    expect(pontos.every((p) => distancia(p, pontoNoCaminho(p)) < 1e-6)).toBe(true);
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
