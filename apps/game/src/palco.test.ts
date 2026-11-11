import { describe, expect, it } from "vitest";
import { PALCO_REFERENCIA } from "./palco";

describe("palco", () => {
  it("usa o viewport de referência em retrato (390×844)", () => {
    expect(PALCO_REFERENCIA).toEqual({ largura: 390, altura: 844 });
    expect(PALCO_REFERENCIA.altura).toBeGreaterThan(PALCO_REFERENCIA.largura);
  });
});
