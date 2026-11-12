import { describe, expect, it } from "vitest";
import { calar, definirSom, falar, PARTITURAS, podeFalar, tocar } from "./sons";

describe("efeitos sonoros", () => {
  it("todo som tem notas curtas, audíveis e que não estouram o volume", () => {
    for (const [som, notas] of Object.entries(PARTITURAS)) {
      expect(notas.length, som).toBeGreaterThan(0);
      for (const nota of notas) {
        expect(nota.hz, som).toBeGreaterThan(100);
        expect(nota.hz, som).toBeLessThan(2000);
        expect(nota.duracao, som).toBeGreaterThan(0);
        expect(nota.inicio + nota.duracao, som).toBeLessThanOrEqual(0.7);
        expect(nota.volume, som).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it("sem áudio no ambiente (ou com o som desligado), tocar e falar não fazem nada", () => {
    expect(() => tocar("acerto")).not.toThrow();
    definirSom(false);
    expect(() => tocar("erro")).not.toThrow();
    definirSom(true);
    expect(podeFalar()).toBe(false);
    expect(() => falar("Olá")).not.toThrow();
    expect(() => calar()).not.toThrow();
  });
});
