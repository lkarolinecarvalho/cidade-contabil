type Ouvinte<Dados> = (dados: Dados) => void;

/**
 * Event bus tipado: o mapa `Eventos` liga cada nome de evento ao tipo dos seus dados.
 * Não depende de Phaser nem de React, para os dois lados poderem importá-lo.
 */
export interface Bus<Eventos> {
  /** Assina o evento. Devolve a função que cancela a assinatura. */
  ouvir<Nome extends keyof Eventos>(nome: Nome, ouvinte: Ouvinte<Eventos[Nome]>): () => void;
  emitir<Nome extends keyof Eventos>(nome: Nome, dados: Eventos[Nome]): void;
}

export function criarBus<Eventos>(): Bus<Eventos> {
  const ouvintes = new Map<keyof Eventos, Set<Ouvinte<never>>>();
  return {
    ouvir(nome, ouvinte) {
      const doEvento = ouvintes.get(nome) ?? new Set<Ouvinte<never>>();
      doEvento.add(ouvinte as Ouvinte<never>);
      ouvintes.set(nome, doEvento);
      return () => {
        doEvento.delete(ouvinte as Ouvinte<never>);
      };
    },
    emitir(nome, dados) {
      // Cópia: um ouvinte pode cancelar a própria assinatura durante a emissão.
      for (const ouvinte of [...(ouvintes.get(nome) ?? [])]) {
        (ouvinte as Ouvinte<typeof dados>)(dados);
      }
    },
  };
}
