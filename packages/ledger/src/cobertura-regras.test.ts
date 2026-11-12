import { describe, expect, it } from "vitest";
import documento from "../../../docs/regras-contabeis.md?raw";
import { type IdRegra, NOTAS_DIDATICAS, REGRAS } from "./index";

/**
 * Critério de aceite do M1: um teste por regra de docs/regras-contabeis.md.
 * Este teste lê o documento e os arquivos de teste e falha se uma regra ficar sem teste.
 */

/**
 * Regras sem comportamento no motor: descrevem a narrativa, o conteúdo ou a camada de
 * jogo. Ficam fora da exigência de teste no ledger, com o motivo registrado.
 */
const FORA_DO_MOTOR: Partial<Record<IdRegra, string>> = {
  "R-ICMS-09":
    "Delimita o que o jogo não trata (substituição tributária e regimes especiais): não há operação para testar.",
  "R-CAP-01":
    "Os dois sócios existem na narrativa (ADR-0007); o motor registra o capital total (R-CAP-05).",
  "R-ENT-03":
    "O bloqueio de despesa pessoal é da camada de jogo: o motor não tem operação de despesa pessoal.",
  "R-IMO-01":
    "Imóvel para revenda não é operação do MVP; a classificação é cobrada em afirmativa (M2).",
  "R-IMO-03":
    "Propriedade para Investimento está fora do MVP como operação; é cobrada em afirmativa (M2).",
};

const idsDoDocumento = [...documento.matchAll(/\*\*(R-[A-Z]+-\d+)\*\*/g)].map((m) => m[1]);
const marcadasComoSimplificacao = [
  ...documento.matchAll(/\*\*(R-[A-Z]+-\d+)\*\* — 📘 SIMPLIFICAÇÃO/g),
].map((m) => m[1]);

const arquivosDeTeste = import.meta.glob("./**/*.test.ts", {
  query: "?raw",
  import: "default",
  eager: true,
});
const titulosDeTeste = Object.values(arquivosDeTeste).flatMap((fonte) =>
  [...fonte.matchAll(/\bit\(\s*["'`]([^"'`]*)/g)].map((m) => m[1] ?? ""),
);

describe("cobertura das regras contábeis", () => {
  it("a lista REGRAS é idêntica à de docs/regras-contabeis.md", () => {
    expect(idsDoDocumento.length).toBeGreaterThan(50);
    expect([...REGRAS]).toEqual(idsDoDocumento);
  });

  it("toda regra tem um teste com o ID no nome, ou um motivo para ficar fora do motor", () => {
    const semTeste = REGRAS.filter(
      (regra) => !(regra in FORA_DO_MOTOR) && !titulosDeTeste.some((t) => t.startsWith(regra)),
    );
    expect(semTeste).toEqual([]);
  });

  it("nenhuma regra dispensada tem teste (a dispensa ficaria desatualizada)", () => {
    const dispensadasComTeste = Object.keys(FORA_DO_MOTOR).filter((regra) =>
      titulosDeTeste.some((t) => t.startsWith(regra)),
    );
    expect(dispensadasComTeste).toEqual([]);
  });

  it("toda simplificação didática 📘 tem nota didática para a UI", () => {
    expect(marcadasComoSimplificacao.length).toBeGreaterThan(0);
    expect(Object.keys(NOTAS_DIDATICAS).sort()).toEqual([...marcadasComoSimplificacao].sort());
  });
});
