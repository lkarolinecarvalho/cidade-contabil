import { carregarConteudoDoJogo, paraOperacaoDoMotor } from "@cidade/content";
import type { Operacao } from "@cidade/ledger";
import { describe, expect, it } from "vitest";
import { type EstadoDoJogo, jogarMissaoInteira, novoJogo } from "../state/jogo";
import { formatarReais } from "../texto/dinheiro";
import { compararCompras, oQueMudou } from "./consequencia";

const { missoes } = carregarConteudoDoJogo();

/** Joga a campanha até a missão informada, inclusive. */
function jogarAte(id: string): EstadoDoJogo {
  let estado = novoJogo();
  for (const m of missoes) {
    estado = jogarMissaoInteira(estado, m);
    if (m.id === id) return estado;
  }
  throw new Error(`Missão não encontrada: ${id}`);
}

type Compra = Extract<Operacao, { tipo: "compra" }>;
function compraDa(id: string): Compra {
  const [operacao] = missoes.find((m) => m.id === id)?.operacoes ?? [];
  if (!operacao) throw new Error(`Missão sem operação: ${id}`);
  const convertida = paraOperacaoDoMotor(operacao, { mes: { ano: 1, mes: 1 } });
  if (convertida.tipo !== "compra") throw new Error(`A missão ${id} não é uma compra`);
  return convertida;
}

describe("consequência da missão: o que mudou nos saldos", () => {
  const resumo = (antes: string, depois: string) =>
    oQueMudou(jogarAte(antes).contabil, jogarAte(depois).contabil).map((m) => [
      m.nome,
      m.antesCentavos,
      m.depoisCentavos,
    ]);

  it("compra a prazo sem tributos: o estoque e a dívida aumentam no mesmo valor", () => {
    expect(resumo("m004-compra-avista", "m004-compra-prazo")).toEqual([
      ["Estoque de Insumos", 0, 650_000],
      ["Fornecedores", 0, 650_000],
    ]);
  });

  it("pagamento da dívida: o dinheiro e a dívida diminuem no mesmo valor", () => {
    expect(resumo("m004-compra-prazo", "m006-pagamento-fornecedor")).toEqual([
      ["Bancos Conta Movimento", 2_050_000, 1_400_000],
      ["Fornecedores", 650_000, 0],
    ]);
  });

  it("a mudança traz a classificação de cada conta", () => {
    const [estoque, fornecedores] = oQueMudou(
      jogarAte("m004-compra-avista").contabil,
      jogarAte("m004-compra-prazo").contabil,
    );
    expect(estoque?.classificacao).toBe("Ativo Circulante");
    expect(fornecedores?.classificacao).toBe("Passivo Circulante");
  });

  it("conversa com a contadora e consignação recebida não mudam nenhum saldo", () => {
    expect(resumo("m000-apresentacao", "m000-como-registrar")).toEqual([]);
    expect(resumo("m009-receber-antes", "m009-consignacao")).toEqual([]);
  });
});

describe("comparação entre duas notas de compra", () => {
  const estado = jogarAte("m010-embalagens").contabil;
  const tabela = (la: string, aqui: string) =>
    Object.fromEntries(
      compararCompras(estado, compraDa(la), compraDa(aqui), formatarReais).map((l) => [
        l.rotulo,
        [l.la, l.aqui, l.mudou],
      ]),
    );

  it("situações B e A: mesma estrutura de nota, finalidades diferentes", () => {
    const t = tabela("m011-refrigerante-da-fabrica", "m008-material-de-limpeza");
    expect(t["Total da nota"]).toEqual(["R$ 1.560,00", "R$ 525,00", false]);
    // Revenda: IPI fora da base. Uso e consumo: IPI dentro da base (R-ICMS-07).
    expect(t["IPI entra na base do ICMS?"]).toEqual(["não", "sim", true]);
    expect(t["Base do ICMS"]).toEqual(["R$ 1.500,00", "R$ 525,00", false]);
    expect(t["ICMS destacado"]).toEqual(["R$ 270,00", "R$ 94,50", false]);
    expect(t["ICMS que volta"]).toEqual(["R$ 270,00", "não volta", true]);
    expect(t["IPI que volta"]).toEqual(["não volta", "não volta", false]);
    expect(t["Custo que entra no estoque"]).toEqual(["R$ 1.290,00", "R$ 525,00", false]);
  });

  it("situações B e D: o IPI é custo para quem revende e crédito para a indústria", () => {
    const t = tabela("m011-refrigerante-da-fabrica", "m010-embalagens");
    expect(t["IPI entra na base do ICMS?"]).toEqual(["não", "não", false]);
    expect(t["ICMS que volta"]).toEqual(["R$ 270,00", "R$ 72,00", false]);
    expect(t["IPI que volta"]).toEqual(["não volta", "R$ 20,00", true]);
    expect(t["Custo que entra no estoque"]).toEqual(["R$ 1.290,00", "R$ 328,00", false]);
  });

  it("a comparação não grava nada no razão", () => {
    const antes = estado.lancamentos.length;
    tabela("m011-refrigerante-da-fabrica", "m010-embalagens");
    expect(estado.lancamentos).toHaveLength(antes);
  });
});
