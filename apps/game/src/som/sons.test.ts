import { describe, expect, it } from "vitest";
import {
  entonacao,
  escolherVoz,
  frasesDe,
  NARRACAO_DISPONIVEL,
  notaDaVoz,
  prepararParaFala,
  RITMO,
  textoEmLeitura,
} from "./narracao";
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

describe("narração: o texto preparado para a fala", () => {
  it("valores em reais viram palavras, com reais e centavos", () => {
    expect(prepararParaFala("Total da nota: R$ 1.560,00.")).toBe("Total da nota: 1560 reais.");
    expect(prepararParaFala("ICMS de R$ 94,50")).toBe("I C M S de 94 reais e 50 centavos");
    expect(prepararParaFala("alface a R$ 0,50 e pão a R$ 1,00")).toBe(
      "alface a 50 centavos e pão a 1 real",
    );
  });

  it("contas, siglas e abreviações são lidas como uma pessoa leria", () => {
    expect(prepararParaFala("Custo: 1.560 − 270 = R$ 1.290,00.")).toBe(
      "Custo: 1560 menos 270 é igual a 1290 reais.",
    );
    expect(prepararParaFala("R$ 12.000,00 ÷ 60 meses")).toBe("12000 reais dividido por 60 meses");
    expect(prepararParaFala("Chapa da Praça Ltda. apura o CMV e o IPI")).toBe(
      "Chapa da Praça Limitada apura o C M V e o IPI",
    );
    // Hífen de palavra composta não é sinal de menos.
    expect(prepararParaFala("o guarda-chuva custa 18%")).toBe("o guarda-chuva custa 18%");
  });

  it("o texto é lido frase por frase, e o tom muda com a pontuação", () => {
    expect(frasesDe("Olá! Eu sou a Marta. Vamos começar do zero?")).toEqual([
      "Olá!",
      "Eu sou a Marta.",
      "Vamos começar do zero?",
    ]);
    // A vírgula dos centavos e o ponto do milhar já saíram antes de dividir em frases.
    expect(frasesDe(prepararParaFala("Custa R$ 1.500,00. Pago hoje."))).toEqual([
      "Custa 1500 reais.",
      "Pago hoje.",
    ]);
    const afirmacao = entonacao("Eu sou a Marta.", 0, 1.18);
    expect(entonacao("Vamos começar?", 0, 1.18).tom).toBeGreaterThan(afirmacao.tom);
    expect(entonacao("Olá!", 0, 1.18).ritmo).toBeGreaterThan(afirmacao.ritmo);
    expect(entonacao("Outra frase.", 1, 1.18).tom).not.toBe(afirmacao.tom);
  });

  it("o ritmo padrão é mais rápido que o normal, sem passar de 1,4", () => {
    expect(RITMO.calma).toBe(1);
    expect(RITMO.animada).toBeGreaterThan(1.1);
    expect(RITMO.acelerada).toBeLessThanOrEqual(1.4);
  });

  it("escolhe a voz mais natural em português do Brasil", () => {
    const vozes = [
      { name: "Microsoft David - English", lang: "en-US" },
      { name: "Joana", lang: "pt-PT" },
      { name: "Microsoft Maria - Portuguese (Brazil)", lang: "pt-BR" },
      { name: "Microsoft Francisca Online (Natural) - Portuguese (Brazil)", lang: "pt-BR" },
    ];
    expect(escolherVoz(vozes)?.name).toMatch(/Francisca/);
    expect(escolherVoz(vozes.slice(0, 2))?.name).toBe("Joana");
    expect(escolherVoz(vozes.slice(0, 1))).toBeUndefined();
    expect(notaDaVoz({ name: "Luciana", lang: "pt_BR" })).toBeGreaterThan(
      notaDaVoz({ name: "Joana", lang: "pt-PT" }),
    );
  });

  it("a narração está desligada no jogo: nenhum botão de ouvir aparece", () => {
    expect(NARRACAO_DISPONIVEL).toBe(false);
    expect(podeFalar()).toBe(false);
  });

  it("sem voz no ambiente, nada está em leitura e parar não dá erro", () => {
    falar("Olá");
    expect(textoEmLeitura()).toBeNull();
    expect(() => calar("Olá")).not.toThrow();
  });
});
