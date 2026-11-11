import { carregarConteudoDoJogo } from "@cidade/content";
import { describe, expect, it } from "vitest";
import { preencherAfirmativa } from "./afirmativas";
import { formatarCentavos, formatarReais } from "./dinheiro";

describe("formatação de dinheiro", () => {
  it("formata centavos inteiros em reais, sem ponto flutuante", () => {
    expect(formatarCentavos(0)).toBe("0,00");
    expect(formatarCentavos(5)).toBe("0,05");
    expect(formatarCentavos(267)).toBe("2,67");
    expect(formatarCentavos(100_000)).toBe("1.000,00");
    expect(formatarCentavos(30_582_667)).toBe("305.826,67");
    expect(formatarCentavos(-427_809)).toBe("−4.278,09");
    expect(formatarReais(28_000_000)).toBe("R$ 280.000,00");
  });
});

describe("preencherAfirmativa", () => {
  const { afirmativas } = carregarConteudoDoJogo();
  const comPlaceholder = afirmativas.find((a) => a.id === "af-icms-por-dentro-01");
  if (!comPlaceholder) throw new Error("afirmativa de teste não encontrada");

  it("usa os valores da operação que o jogador acabou de fazer", () => {
    const texto = preencherAfirmativa(comPlaceholder, {
      totalNota: 4_000_000,
      icms: 720_000,
      custoEstoque: 3_280_000,
    });
    expect(texto.enunciado).toContain("por R$ 40.000,00 com ICMS de 18%");
    expect(texto.explicacao).toContain("O estoque entra por R$ 32.800,00, e R$ 7.200,00 vão");
  });

  it("sem operação, usa os valores de exemplo", () => {
    const texto = preencherAfirmativa(comPlaceholder);
    expect(texto.enunciado).toContain("por R$ 3.000,00 com ICMS de 18%");
    expect(texto.explicacao).toContain("R$ 2.460,00");
    expect(texto.explicacao).toContain("R$ 540,00");
  });

  it("toda afirmativa do jogo pode ser exibida sem operação, sem placeholder sobrando", () => {
    for (const afirmativa of afirmativas) {
      const texto = preencherAfirmativa(afirmativa);
      expect(`${texto.enunciado} ${texto.explicacao}`, afirmativa.id).not.toMatch(/\{\{|\}\}/);
    }
  });
});
