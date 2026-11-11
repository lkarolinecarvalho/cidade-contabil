import { describe, expect, it } from "vitest";
import { criarBus } from "./criarBus";

interface Eventos {
  ponto: { valor: number };
  pronto: undefined;
}

describe("event bus tipado", () => {
  it("entrega os dados a todos os ouvintes do evento, e só a eles", () => {
    const bus = criarBus<Eventos>();
    const recebidos: string[] = [];
    bus.ouvir("ponto", ({ valor }) => recebidos.push(`a:${valor}`));
    bus.ouvir("ponto", ({ valor }) => recebidos.push(`b:${valor}`));
    bus.ouvir("pronto", () => recebidos.push("pronto"));

    bus.emitir("ponto", { valor: 7 });
    expect(recebidos).toEqual(["a:7", "b:7"]);
    bus.emitir("pronto", undefined);
    expect(recebidos).toEqual(["a:7", "b:7", "pronto"]);
  });

  it("para de entregar depois que a assinatura é cancelada", () => {
    const bus = criarBus<Eventos>();
    let total = 0;
    const cancelar = bus.ouvir("ponto", ({ valor }) => {
      total += valor;
    });
    bus.emitir("ponto", { valor: 1 });
    cancelar();
    bus.emitir("ponto", { valor: 10 });
    expect(total).toBe(1);
  });

  it("um ouvinte pode cancelar a si mesmo durante a emissão", () => {
    const bus = criarBus<Eventos>();
    const chamadas: string[] = [];
    const cancelar = bus.ouvir("pronto", () => {
      chamadas.push("uma vez");
      cancelar();
    });
    bus.ouvir("pronto", () => chamadas.push("sempre"));
    bus.emitir("pronto", undefined);
    bus.emitir("pronto", undefined);
    expect(chamadas).toEqual(["uma vez", "sempre", "sempre"]);
  });

  it("emitir sem ouvintes não faz nada", () => {
    expect(() => criarBus<Eventos>().emitir("pronto", undefined)).not.toThrow();
  });
});
