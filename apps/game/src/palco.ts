/** Viewport de referência do jogo, em retrato (docs/arquitetura.md). */
export const PALCO_REFERENCIA = { largura: 390, altura: 844 } as const;

/** Expõe a proporção de referência para o CSS dimensionar o palco. */
export function aplicarProporcaoDoPalco(palco: HTMLElement): void {
  palco.style.setProperty("--palco-largura", String(PALCO_REFERENCIA.largura));
  palco.style.setProperty("--palco-altura", String(PALCO_REFERENCIA.altura));
}
