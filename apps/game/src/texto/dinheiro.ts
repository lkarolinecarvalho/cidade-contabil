import type { Centavos } from "@cidade/ledger";

/** Centavos → "1.234,56". A formatação em reais acontece só na UI (ADR-0006). */
export function formatarCentavos(centavos: Centavos): string {
  const absoluto = Math.abs(centavos);
  const inteiros = String(Math.trunc(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fracao = String(absoluto % 100).padStart(2, "0");
  return `${centavos < 0 ? "−" : ""}${inteiros},${fracao}`;
}

/**
 * Lê um valor digitado em reais ("1.234,56", "1234,5", "300") e devolve centavos
 * inteiros, sem passar por ponto flutuante. Devolve `null` se o texto não for um valor.
 */
export function lerReais(texto: string): Centavos | null {
  const limpo = texto.trim().replace(/^R\$\s*/, "");
  const partes = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(limpo);
  if (!partes) return null;
  const [, inteiros = "", fracao = ""] = partes;
  const centavos = Number(inteiros.replaceAll(".", "")) * 100 + Number(fracao.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** Centavos → "R$ 1.234,56". */
export function formatarReais(centavos: Centavos): string {
  return `R$ ${formatarCentavos(centavos)}`;
}
