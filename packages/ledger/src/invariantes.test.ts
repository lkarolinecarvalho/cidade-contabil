import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { multiplicarEDividir } from "./dinheiro";
import { ESTOQUE_VAZIO, entradaNoEstoque, saidaDoEstoque } from "./estoque";
import {
  aplicar,
  balancete,
  criarEmpresa,
  type DataJogo,
  ErroDeOperacao,
  type EstadoContabil,
  type MeioDePagamento,
  type Operacao,
} from "./index";
import { verificarInvariantes } from "./testes/apoio";

/** Testes de propriedade dos invariantes do ledger (CLAUDE.md, M1). */

const meio: fc.Arbitrary<MeioDePagamento> = fc.constantFrom("caixa", "bancos");
const valor = fc.integer({ min: 1, max: 5_000_000 });
const produto = fc.constantFrom("arroz", "feijao");
const item = fc.record({
  produto,
  quantidade: fc.integer({ min: 1, max: 500 }),
  precoUnitarioCentavos: fc.integer({ min: 1, max: 20_000 }),
});

/** Operação que depende do mês em que será aplicada (depreciação e apuração). */
type OperacaoGerada = (data: DataJogo) => Operacao;
const fixa = (operacao: fc.Arbitrary<Operacao>): fc.Arbitrary<OperacaoGerada> =>
  operacao.map((o) => () => o);

const operacao: fc.Arbitrary<OperacaoGerada> = fc.oneof(
  fixa(valor.map((valorCentavos) => ({ tipo: "subscricao", valorCentavos }))),
  fixa(fc.record({ tipo: fc.constant("integralizacao"), valorCentavos: valor, meio })),
  fixa(valor.map((valorCentavos) => ({ tipo: "deposito", valorCentavos }))),
  fixa(
    fc.record({
      tipo: fc.constant("compra_imobilizado"),
      itens: fc.array(
        fc.record({
          classe: fc.constantFrom("terrenos", "edificacoes", "moveis_utensilios", "equipamentos"),
          valorCentavos: valor,
        }),
        { minLength: 1, maxLength: 3 },
      ),
      meio,
    }),
  ),
  fixa(
    fc.record({
      tipo: fc.constant("compra"),
      itens: item.map((i) => [i]),
      ipiAliquota: fc.integer({ min: 0, max: 3000 }),
      freteCentavos: fc.integer({ min: 0, max: 50_000 }),
      condicao: fc.oneof(
        fc.record({ tipo: fc.constant("avista"), meio }),
        fc.record({ tipo: fc.constant("prazo"), dias: fc.integer({ min: 1, max: 90 }) }),
      ),
    }),
  ),
  fixa(
    fc.record({
      tipo: fc.constant("venda"),
      itens: item.map((i) => [i]),
      condicao: fc.oneof(
        fc.record({ tipo: fc.constant("avista") }),
        fc.record({ tipo: fc.constant("prazo"), dias: fc.integer({ min: 1, max: 90 }) }),
      ),
    }),
  ),
  fixa(fc.record({ tipo: fc.constant("recebimento"), valorCentavos: valor, meio })),
  fixa(
    fc.record({
      tipo: fc.constant("pagamento"),
      obrigacao: fc.constantFrom("fornecedores", "salarios", "icms"),
      valorCentavos: valor,
      meio,
    }),
  ),
  fixa(valor.map((valorCentavos) => ({ tipo: "provisao_salarios", valorCentavos }))),
  fixa(
    fc.record({
      tipo: fc.constant("despesa"),
      natureza: fc.constant("energia_eletrica"),
      valorCentavos: valor,
      meio,
    }),
  ),
  fc.constant<OperacaoGerada>((data) => ({
    tipo: "depreciacao",
    mes: { ano: data.ano, mes: data.mes },
  })),
  fc.constant<OperacaoGerada>((data) => ({
    tipo: "apuracao_icms",
    mes: { ano: data.ano, mes: data.mes },
  })),
  fixa(fc.constant({ tipo: "encerramento" })),
);

/** Três operações por dia, dez dias por mês: as sequências longas atravessam vários meses. */
function dataDaOperacao(indice: number): DataJogo {
  const diaCorrido = Math.floor(indice / 3);
  const mesCorrido = Math.floor(diaCorrido / 10);
  return {
    ano: 1 + Math.floor(mesCorrido / 12),
    mes: 1 + (mesCorrido % 12),
    dia: 1 + (diaCorrido % 10),
  };
}

describe("invariantes do razão (propriedade)", () => {
  it("qualquer sequência de operações mantém D = C, Ativo = Passivo + PL e o estoque não negativo", () => {
    let aplicadas = 0;
    fc.assert(
      fc.property(fc.array(operacao, { minLength: 1, maxLength: 80 }), (geradas) => {
        // Capital inicial, para a maioria das operações não ser bloqueada por falta de saldo.
        let estado: EstadoContabil = criarEmpresa();
        estado = aplicar(
          estado,
          { tipo: "subscricao", valorCentavos: 100_000_000 },
          dataDaOperacao(0),
        );
        estado = aplicar(
          estado,
          { tipo: "integralizacao", valorCentavos: 50_000_000, meio: "bancos" },
          dataDaOperacao(0),
        );
        estado = aplicar(
          estado,
          { tipo: "integralizacao", valorCentavos: 20_000_000, meio: "caixa" },
          dataDaOperacao(0),
        );

        geradas.forEach((gerar, indice) => {
          const data = dataDaOperacao(indice);
          const antes = estado;
          try {
            estado = aplicar(estado, gerar(data), data);
            aplicadas++;
          } catch (erro) {
            // Operação bloqueada é esperada; qualquer outro erro é defeito do motor.
            if (!(erro instanceof ErroDeOperacao)) throw erro;
            expect(estado).toBe(antes);
          }
          verificarInvariantes(estado);
        });

        // Caixa e Bancos nunca ficam com saldo credor.
        const { papeis } = estado.planoDeContas;
        for (const linha of balancete(estado).linhas) {
          if (linha.conta === papeis.caixa || linha.conta === papeis.bancos) {
            expect(linha.saldoCredorCentavos).toBe(0);
          }
        }
      }),
      { numRuns: 300 },
    );
    // Garante que a propriedade exercitou operações de verdade, não só bloqueios.
    expect(aplicadas).toBeGreaterThan(1000);
  });

  it("o estado é serializável em JSON sem perda", () => {
    fc.assert(
      fc.property(fc.array(operacao, { maxLength: 30 }), (geradas) => {
        let estado: EstadoContabil = criarEmpresa();
        estado = aplicar(
          estado,
          { tipo: "subscricao", valorCentavos: 100_000_000 },
          dataDaOperacao(0),
        );
        estado = aplicar(
          estado,
          { tipo: "integralizacao", valorCentavos: 100_000_000, meio: "bancos" },
          dataDaOperacao(0),
        );
        geradas.forEach((gerar, indice) => {
          const data = dataDaOperacao(indice);
          try {
            estado = aplicar(estado, gerar(data), data);
          } catch (erro) {
            if (!(erro instanceof ErroDeOperacao)) throw erro;
          }
        });
        expect(JSON.parse(JSON.stringify(estado))).toEqual(estado);
      }),
      { numRuns: 50 },
    );
  });
});

describe("estoque com custo médio (propriedade)", () => {
  it("R-EST-03: vender tudo, em qualquer ordem de lotes, zera o valor sem sobrar centavo", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 0, max: 10_000_000 })),
          {
            minLength: 1,
            maxLength: 10,
          },
        ),
        fc.array(fc.integer({ min: 1, max: 300 }), { maxLength: 30 }),
        (entradas, saidas) => {
          let saldo = ESTOQUE_VAZIO;
          for (const [quantidade, valorDaEntrada] of entradas) {
            saldo = entradaNoEstoque(saldo, quantidade, valorDaEntrada);
          }
          const valorInicial = saldo.valorCentavos;
          let cmvTotal = 0;
          for (const quantidade of saidas) {
            if (quantidade > saldo.quantidade) continue;
            const saida = saidaDoEstoque(saldo, quantidade);
            expect(saida.cmvCentavos).toBeGreaterThanOrEqual(0);
            expect(saida.saldo.valorCentavos).toBeGreaterThanOrEqual(0);
            saldo = saida.saldo;
            cmvTotal += saida.cmvCentavos;
          }
          if (saldo.quantidade > 0) {
            const ultima = saidaDoEstoque(saldo, saldo.quantidade);
            saldo = ultima.saldo;
            cmvTotal += ultima.cmvCentavos;
          }
          expect(saldo).toEqual({ quantidade: 0, valorCentavos: 0 });
          expect(cmvTotal).toBe(valorInicial);
        },
      ),
    );
  });
});

describe("arredondamento (propriedade)", () => {
  it("R-GER-02: multiplicarEDividir fica a no máximo meio centavo do valor exato, para cima no empate", () => {
    fc.assert(
      fc.property(
        // Faixa em que o resultado cabe num inteiro seguro (até 1e15).
        fc.integer({ min: 0, max: 10_000_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (a, b, divisor) => {
          const resultado = BigInt(multiplicarEDividir(a, b, divisor));
          const numerador = BigInt(a) * BigInt(b);
          const d = BigInt(divisor);
          // 2·|resultado·d − numerador| ≤ d, e no empate o resultado é o de cima.
          const diferenca = resultado * d - numerador;
          expect(2n * diferenca <= d).toBe(true);
          expect(2n * diferenca > -d).toBe(true);
        },
      ),
    );
  });
});
