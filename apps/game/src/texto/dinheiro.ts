import type { Centavos } from "@cidade/ledger";

/** Centavos → "1.234,56". A formatação em reais acontece só na UI (ADR-0006). */
export function formatarCentavos(centavos: Centavos): string {
  const absoluto = Math.abs(centavos);
  const inteiros = String(Math.trunc(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fracao = String(absoluto % 100).padStart(2, "0");
  return `${centavos < 0 ? "−" : ""}${inteiros},${fracao}`;
}

/** Centavos → "R$ 1.234,56". */
export function formatarReais(centavos: Centavos): string {
  return `R$ ${formatarCentavos(centavos)}`;
}
