import { carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import { desenharBoneco } from "./bonecos";
import { desenharChao, desenharEnfeite, ENFEITES, type PlantaDoChao } from "./cenario";
import { desenharEdificio, temDesenhoDeEdificio } from "./edificios";
import { clarear, criarIso, escurecer } from "./iso";
import { desenharRetrato } from "./personagens";
import { paraDataUrl } from "./svg";

const conteudo = carregarConteudoDoJogo();
const formas = (desenho: string) => desenho.split("<polygon").length - 1;

describe("arte em SVG", () => {
  it("todo estabelecimento do conteúdo tem edifício desenhado", () => {
    for (const { id } of conteudo.estabelecimentos) {
      expect(temDesenhoDeEdificio(id), id).toBe(true);
      expect(desenharEdificio(id)).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    }
    expect(() => desenharEdificio("shopping")).toThrow(/Sem desenho/);
  });

  it("o edifício virado para a esquerda é outro desenho, com as mesmas formas", () => {
    for (const { id } of conteudo.estabelecimentos) {
      const direita = desenharEdificio(id, "direita");
      const esquerda = desenharEdificio(id, "esquerda");
      expect(esquerda, id).not.toBe(direita);
      expect(formas(esquerda)).toBe(formas(direita));
    }
  });

  it("todo NPC e o avatar têm boneco e retrato, cada um com a sua aparência", () => {
    const ids = ["avatar", ...conteudo.npcs.map((n) => n.id)];
    const desenhos = ids.map((id) => desenharBoneco(id));
    expect(new Set(desenhos).size).toBe(ids.length);
    for (const id of ids) expect(desenharRetrato(id)).toContain("<svg");
    expect(desenharBoneco("avatar", "esquerda")).not.toBe(desenharBoneco("avatar", "direita"));
  });

  it("personagem desconhecido usa a aparência padrão, sem quebrar", () => {
    expect(desenharBoneco("alguem-novo")).toContain("<svg");
  });

  it("todo enfeite tem desenho", () => {
    for (const tipo of Object.keys(ENFEITES) as (keyof typeof ENFEITES)[]) {
      expect(formas(desenharEnfeite(tipo)), tipo).toBeGreaterThan(3);
    }
  });

  it("o chão desenha a praça, a calçada de cada edifício e cada trecho de caminho", () => {
    const planta: PlantaDoChao = {
      largura: 390,
      altura: 844,
      unidade: 10,
      centro: { x: 195, y: 462 },
      raioDaPraca: 3.5,
      edificios: [[-6, 6]],
      ladoDoEdificio: 6,
      trechos: [],
    };
    const semCaminhos = formas(desenharChao(planta));
    const comCaminhos = formas(
      desenharChao({
        ...planta,
        trechos: [
          [
            [0, 0],
            [4, 0],
          ],
          [
            [0, 0],
            [5, 5],
          ],
        ],
      }),
    );
    expect(semCaminhos).toBeGreaterThan(0);
    expect(comCaminhos).toBeGreaterThan(semCaminhos);
  });

  it("gera URL data: utilizável em <img>", () => {
    const url = paraDataUrl(desenharRetrato("avatar"));
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.split(",")[1] ?? "")).toBe(desenharRetrato("avatar"));
  });
});

describe("projeção isométrica", () => {
  const opcoes = { unidade: 10, origem: { x: 100, y: 50 } };
  const iso = criarIso(opcoes);
  const espelhado = criarIso({ ...opcoes, espelhado: true });

  it("x desce para a direita, y desce para a esquerda e z sobe", () => {
    expect(iso.ponto(0, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(iso.ponto(1, 0, 0)).toEqual({ x: 110, y: 55 });
    expect(iso.ponto(0, 1, 0)).toEqual({ x: 90, y: 55 });
    expect(iso.ponto(0, 0, 1)).toEqual({ x: 100, y: 40 });
  });

  it("espelhado troca os eixos x e y", () => {
    expect(espelhado.ponto(2, 1, 3)).toEqual(iso.ponto(1, 2, 3));
  });

  it("a face do lado direito da tela é a mais escura, também no desenho espelhado", () => {
    const cor = "#808080";
    const escura = escurecer(cor, 0.2);
    expect(iso.faceX(1, 0, 0, 1, 1, cor)).toContain(escura);
    expect(iso.faceY(1, 0, 0, 1, 1, cor)).toContain(cor);
    expect(espelhado.faceX(1, 0, 0, 1, 1, cor)).toContain(cor);
    expect(espelhado.faceY(1, 0, 0, 1, 1, cor)).toContain(escura);
    expect(clarear("#000000", 1)).toBe("#ffffff");
  });
});
