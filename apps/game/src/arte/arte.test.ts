import { carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import { desenharEdificio, temDesenhoDeEdificio } from "./edificios";
import { desenharPersonagem, desenharRetrato } from "./personagens";
import { paraDataUrl } from "./svg";

const conteudo = carregarConteudoDoJogo();

describe("arte em SVG", () => {
  it("todo estabelecimento do conteúdo tem fachada desenhada", () => {
    for (const { id } of conteudo.estabelecimentos) {
      expect(temDesenhoDeEdificio(id), id).toBe(true);
      expect(desenharEdificio(id)).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    }
    expect(() => desenharEdificio("shopping")).toThrow(/Sem desenho/);
  });

  it("todo NPC e o avatar têm desenho de corpo inteiro e retrato, cada um com a sua aparência", () => {
    const ids = ["avatar", ...conteudo.npcs.map((n) => n.id)];
    const desenhos = ids.map((id) => desenharPersonagem(id));
    expect(new Set(desenhos).size).toBe(ids.length);
    for (const id of ids) expect(desenharRetrato(id)).toContain("<svg");
  });

  it("personagem desconhecido usa a aparência padrão, sem quebrar", () => {
    expect(desenharPersonagem("alguem-novo")).toContain("<svg");
  });

  it("gera URL data: utilizável em <img>", () => {
    const url = paraDataUrl(desenharRetrato("avatar"));
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.split(",")[1] ?? "")).toBe(desenharRetrato("avatar"));
  });
});
