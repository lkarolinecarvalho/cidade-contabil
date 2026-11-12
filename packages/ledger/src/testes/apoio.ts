import { expect } from "vitest";
import {
  aplicar,
  balancete,
  balanco,
  type DataJogo,
  type EstadoContabil,
  type Lancamento,
  type Operacao,
  preverLancamentos,
} from "../index";

/** Converte "1.234,56" em centavos inteiros (123456), sem passar por float. */
export function r(reais: string): number {
  const correspondencia = /^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/.exec(reais);
  if (!correspondencia) throw new Error(`Valor em reais inválido: ${reais}`);
  const [, inteiros = "", centavos = ""] = correspondencia;
  return Number(inteiros.replaceAll(".", "")) * 100 + Number(centavos);
}

/** Converte centavos em "1.234,56", para os testes lerem como os cenários. */
export function reais(centavos: number): string {
  const sinal = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(centavos);
  const inteiros = String(Math.trunc(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sinal}${inteiros},${String(absoluto % 100).padStart(2, "0")}`;
}

export const dia = (d: number, mes = 1, ano = 1): DataJogo => ({ ano, mes, dia: d });

export type LinhaEsperada = readonly [conta: string, lado: "D" | "C", valor: string];

/** Partidas dos lançamentos como [nome da conta, lado, valor], na ordem do razão. */
export function linhas(
  estado: EstadoContabil,
  lancamentos: readonly Lancamento[],
): LinhaEsperada[] {
  const nomes = new Map(estado.planoDeContas.contas.map((c) => [c.codigo, c.nome]));
  return lancamentos.flatMap((l) =>
    l.partidas.map((p) => [nomes.get(p.conta) ?? p.conta, p.lado, reais(p.valorCentavos)] as const),
  );
}

/** Invariantes checados em todo teste do ledger (CLAUDE.md). */
export function verificarInvariantes(estado: EstadoContabil): void {
  // Débitos = créditos em cada lançamento (R-GER-01).
  for (const lancamento of estado.lancamentos) {
    const soma = (lado: "D" | "C") =>
      lancamento.partidas.reduce((s, p) => (p.lado === lado ? s + p.valorCentavos : s), 0);
    expect(soma("D"), `lançamento ${lancamento.id} desequilibrado`).toBe(soma("C"));
    for (const partida of lancamento.partidas) {
      expect(Number.isSafeInteger(partida.valorCentavos)).toBe(true);
      expect(partida.valorCentavos).toBeGreaterThan(0);
    }
  }

  const ultimo = estado.lancamentos.at(-1);
  if (ultimo) {
    // Ativo = Passivo + PL, com o resultado apurado (R-DEM-03).
    const bp = balanco(estado, ultimo.data);
    expect(bp.ativo.totalCentavos).toBe(bp.totalPassivoEPatrimonioLiquidoCentavos);
  }

  // Balancete fecha (R-DEM-01).
  const b = balancete(estado);
  expect(b.totalDevedorCentavos).toBe(b.totalCredorCentavos);

  // Nenhum estoque com quantidade negativa; o inventário bate com a conta Estoque.
  let valorEmEstoque = 0;
  for (const saldo of Object.values(estado.estoque)) {
    expect(saldo.quantidade).toBeGreaterThanOrEqual(0);
    expect(saldo.valorCentavos).toBeGreaterThanOrEqual(0);
    valorEmEstoque += saldo.valorCentavos;
  }
  const { papeis } = estado.planoDeContas;
  const contasDeEstoque = [
    papeis.estoque,
    papeis.estoqueInsumos,
    papeis.produtosAcabados,
    papeis.materialDeConsumo,
  ];
  const saldoDasContas = b.linhas
    .filter((l) => contasDeEstoque.includes(l.conta))
    .reduce((s, l) => s + l.saldoDevedorCentavos, 0);
  expect(saldoDasContas).toBe(valorEmEstoque);
}

/** Aplica a operação, checa os invariantes e devolve os lançamentos como linhas legíveis. */
export function executar(
  estado: EstadoContabil,
  operacao: Operacao,
  data: DataJogo,
): { estado: EstadoContabil; linhas: LinhaEsperada[]; lancamentos: readonly Lancamento[] } {
  const previsao = preverLancamentos(estado, operacao, data);
  const novoEstado = aplicar(estado, operacao, data);
  expect(novoEstado).toEqual(previsao.novoEstado);
  verificarInvariantes(novoEstado);
  return {
    estado: novoEstado,
    linhas: linhas(novoEstado, previsao.lancamentos),
    lancamentos: previsao.lancamentos,
  };
}

/** Aplica várias operações em sequência, checando os invariantes a cada uma. */
export function executarTodas(
  estado: EstadoContabil,
  operacoes: readonly (readonly [Operacao, DataJogo])[],
): EstadoContabil {
  return operacoes.reduce(
    (atual, [operacao, data]) => executar(atual, operacao, data).estado,
    estado,
  );
}

/** Saldo de uma conta pelo nome, como "1.234,56 D", "1.234,56 C" ou "0,00". */
export function saldoDe(estado: EstadoContabil, nome: string): string {
  const linha = balancete(estado).linhas.find((l) => l.nome === nome);
  if (!linha) throw new Error(`Conta não encontrada: ${nome}`);
  if (linha.saldoDevedorCentavos > 0) return `${reais(linha.saldoDevedorCentavos)} D`;
  if (linha.saldoCredorCentavos > 0) return `${reais(linha.saldoCredorCentavos)} C`;
  return "0,00";
}

export const compraDeMercadorias = (
  quantidade: number,
  preco: string,
  condicao: Extract<Operacao, { tipo: "compra" }>["condicao"],
  extras: { ipiAliquota?: number; frete?: string; produto?: string } = {},
): Operacao => ({
  tipo: "compra",
  itens: [
    {
      produto: extras.produto ?? "mercadorias-diversas",
      quantidade,
      precoUnitarioCentavos: r(preco),
    },
  ],
  ipiAliquota: extras.ipiAliquota ?? 0,
  freteCentavos: extras.frete ? r(extras.frete) : 0,
  condicao,
});

export const vendaDeMercadorias = (
  quantidade: number,
  preco: string,
  condicao: Extract<Operacao, { tipo: "venda" }>["condicao"],
  produto = "mercadorias-diversas",
): Operacao => ({
  tipo: "venda",
  itens: [{ produto, quantidade, precoUnitarioCentavos: r(preco) }],
  condicao,
});
