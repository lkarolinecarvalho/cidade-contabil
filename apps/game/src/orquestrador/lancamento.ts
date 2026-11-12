import type { Missao } from "@cidade/content";
import {
  balanco,
  type Centavos,
  compararLancamento,
  type DataJogo,
  dre,
  type EstadoContabil,
  type IdRegra,
  type Lado,
  type Lancamento,
  type Operacao,
  type Partida,
  preverLancamentos,
  type ResultadoComparacao,
  saldos,
  simularLancamentoInformado,
} from "@cidade/ledger";
import { formatarReais, lerReais } from "../texto/dinheiro";

/** Os 4 níveis de ajuda no lançamento (GDD, seção 9). */
export type Ajuda = "pronto" | "contas_sugeridas" | "contas_e_valores" | "livre";

const AJUDA_POR_NIVEL: readonly Ajuda[] = [
  "pronto",
  "contas_sugeridas",
  "contas_e_valores",
  "livre",
];

/** Ajuda da missão: a declarada no conteúdo ou, em "auto", a do nível dela. */
export function ajudaDaMissao(missao: Pick<Missao, "ajudaLancamento" | "nivel">): Ajuda {
  if (missao.ajudaLancamento !== "auto") return missao.ajudaLancamento;
  return AJUDA_POR_NIVEL[Math.min(missao.nivel, AJUDA_POR_NIVEL.length) - 1] ?? "livre";
}

/** Linhas do lançamento esperado, somando o que cai na mesma conta e no mesmo lado. */
export function linhasEsperadas(lancamentos: readonly Lancamento[]): Partida[] {
  const linhas: Partida[] = [];
  for (const partida of lancamentos.flatMap((l) => l.partidas)) {
    const indice = linhas.findIndex((l) => l.conta === partida.conta && l.lado === partida.lado);
    const existente = linhas[indice];
    if (existente) {
      linhas[indice] = {
        ...existente,
        valorCentavos: existente.valorCentavos + partida.valorCentavos,
      };
    } else {
      linhas.push(partida);
    }
  }
  return linhas;
}

/** Linha do lançamento enquanto o jogador a monta. */
export interface LinhaEmEdicao {
  readonly id: number;
  readonly conta: string;
  readonly lado: Lado | null;
  /** Valor como o jogador digitou, em reais ("3.000,00"). */
  readonly valor: string;
  /** O que a ajuda já entrega pronto e o jogador não muda. */
  readonly fixo: { readonly conta: boolean; readonly lado: boolean; readonly valor: boolean };
}

const semReais = (centavos: Centavos): string => formatarReais(centavos).replace("R$ ", "");

export const linhaVazia = (id: number): LinhaEmEdicao => ({
  id,
  conta: "",
  lado: null,
  valor: "",
  fixo: { conta: false, lado: false, valor: false },
});

/** Ponto de partida do editor, conforme o nível de ajuda. */
export function linhasIniciais(ajuda: Ajuda, esperadas: readonly Partida[]): LinhaEmEdicao[] {
  switch (ajuda) {
    case "pronto":
      return esperadas.map((linha, id) => ({
        id,
        conta: linha.conta,
        lado: linha.lado,
        valor: semReais(linha.valorCentavos),
        fixo: { conta: true, lado: true, valor: true },
      }));
    case "contas_sugeridas":
      // Em ordem de código: a ordem do lançamento entregaria quem é débito e quem é crédito.
      return [...esperadas]
        .sort((a, b) => a.conta.localeCompare(b.conta, "pt-BR", { numeric: true }))
        .map((linha, id) => ({
          id,
          conta: linha.conta,
          lado: null,
          valor: semReais(linha.valorCentavos),
          fixo: { conta: true, lado: false, valor: true },
        }));
    case "contas_e_valores":
      return esperadas.map((_, id) => linhaVazia(id));
    case "livre":
      return [linhaVazia(0), linhaVazia(1)];
  }
}

export type LeituraDasLinhas =
  | { readonly ok: true; readonly partidas: Partida[] }
  | { readonly ok: false; readonly erro: string };

/** Converte as linhas digitadas em partidas, ou diz o que falta preencher. */
export function lerLinhas(linhas: readonly LinhaEmEdicao[]): LeituraDasLinhas {
  if (linhas.length === 0) return { ok: false, erro: "Adicione ao menos uma linha." };
  const partidas: Partida[] = [];
  for (const [indice, linha] of linhas.entries()) {
    const numero = indice + 1;
    if (!linha.conta) return { ok: false, erro: `Escolha a conta da linha ${numero}.` };
    if (!linha.lado) return { ok: false, erro: `Marque débito ou crédito na linha ${numero}.` };
    const valorCentavos = lerReais(linha.valor);
    if (valorCentavos === null || valorCentavos === 0) {
      return { ok: false, erro: `Informe o valor da linha ${numero}, como 1.234,56.` };
    }
    partidas.push({ conta: linha.conta, lado: linha.lado, valorCentavos });
  }
  return { ok: true, partidas };
}

/** Saldo de uma conta com o lançamento do jogador e com o lançamento correto. */
export interface SaldoComparado {
  readonly conta: string;
  readonly nome: string;
  readonly comOSeuLancamentoCentavos: Centavos;
  readonly corretoCentavos: Centavos;
}

/** Números das demonstrações usados na prévia do erro. */
export interface ResumoPatrimonial {
  readonly ativoCirculanteCentavos: Centavos;
  readonly ativoNaoCirculanteCentavos: Centavos;
  readonly totalDoAtivoCentavos: Centavos;
  readonly passivoCentavos: Centavos;
  readonly patrimonioLiquidoCentavos: Centavos;
  readonly resultadoDoMesCentavos: Centavos;
}

export interface Conferencia {
  readonly comparacao: ResultadoComparacao;
  /** Só existe quando o lançamento está equilibrado e errado (ADR-0005). */
  readonly previa: {
    readonly comOSeuLancamento: ResumoPatrimonial;
    readonly correto: ResumoPatrimonial;
    /** Contas cujo saldo ficaria diferente do correto. */
    readonly contas: readonly SaldoComparado[];
  } | null;
  /** Comentário do contador sobre o erro; vazio quando o lançamento está correto. */
  readonly comentario: string;
  readonly regras: readonly IdRegra[];
}

function resumir(
  bp: ReturnType<typeof balanco>,
  resultadoDoMesCentavos: Centavos,
): ResumoPatrimonial {
  return {
    ativoCirculanteCentavos: bp.ativo.totalCirculanteCentavos,
    ativoNaoCirculanteCentavos: bp.ativo.totalNaoCirculanteCentavos,
    totalDoAtivoCentavos: bp.ativo.totalCentavos,
    passivoCentavos: bp.passivo.totalCirculanteCentavos,
    patrimonioLiquidoCentavos: bp.patrimonioLiquido.totalCentavos,
    resultadoDoMesCentavos,
  };
}

const mesDe = (data: DataJogo) => ({ de: { ...data, dia: 1 }, ate: data });

/**
 * Confere o lançamento do jogador contra o do motor. Nada é gravado: o razão só
 * recebe os lançamentos do motor, depois (ADR-0005).
 * `operacao` é `null` quando o fato não é uma operação do motor. Há também operações
 * que não geram lançamento, como receber mercadoria em consignação.
 */
export function conferirLancamento(
  contabil: EstadoContabil,
  operacao: Operacao | null,
  informado: readonly Partida[],
  data: DataJogo,
): Conferencia {
  const previsao = operacao ? preverLancamentos(contabil, operacao, data) : null;
  const esperado = previsao?.lancamentos ?? [];
  const comparacao = compararLancamento(esperado, informado);
  if (comparacao.correto) return { comparacao, previa: null, comentario: "", regras: [] };

  if (!comparacao.equilibrado) {
    return {
      comparacao,
      previa: null,
      comentario: `Os débitos somam ${formatarReais(comparacao.totalDebitosCentavos)} e os créditos, ${formatarReais(comparacao.totalCreditosCentavos)}. Em todo lançamento, o total debitado é igual ao total creditado.`,
      regras: ["R-GER-01"],
    };
  }

  const simulacao = simularLancamentoInformado(contabil, informado, data);
  if (!simulacao.equilibrado) throw new Error("A simulação deveria estar equilibrada.");
  const certo = previsao?.novoEstado ?? contabil;
  const previa = {
    comOSeuLancamento: resumir(simulacao.balanco, simulacao.dre.resultadoCentavos),
    correto: resumir(balanco(certo, data), dre(certo, mesDe(data)).resultadoCentavos),
    contas: saldosDiferentes(contabil, certo, informado),
  };
  // Tudo certo, menos os lados: o erro mais comum de quem está começando.
  if (comparacao.linhas.every((linha) => linha.situacao === "lado_incorreto")) {
    return {
      comparacao,
      previa,
      comentario:
        "As contas e os valores estão certos, mas os lados estão trocados: o que você debitou deveria ser creditado, e o que creditou, debitado. Veja como os saldos ficariam ao contrário do que aconteceu.",
      regras: [],
    };
  }
  return { comparacao, previa, ...comentarDoContador(contabil, operacao, informado, previa) };
}

/** Contas cujo saldo, com o lançamento do jogador, difere do saldo correto. */
function saldosDiferentes(
  antes: EstadoContabil,
  certo: EstadoContabil,
  informado: readonly Partida[],
): SaldoComparado[] {
  const corretos = new Map(saldos(certo).map((s) => [s.conta, s.saldoCentavos]));
  return saldos(antes)
    .map((saldo) => {
      // O saldo é no lado da natureza: débito soma em conta devedora, crédito em credora.
      const variacao = informado
        .filter((p) => p.conta === saldo.conta)
        .reduce(
          (soma, p) =>
            soma +
            ((p.lado === "D") === (saldo.natureza === "devedora") ? 1 : -1) * p.valorCentavos,
          0,
        );
      return {
        conta: saldo.conta,
        nome: saldo.nome,
        comOSeuLancamentoCentavos: saldo.saldoCentavos + variacao,
        corretoCentavos: corretos.get(saldo.conta) ?? 0,
      };
    })
    .filter((s) => s.comOSeuLancamentoCentavos !== s.corretoCentavos);
}

/**
 * Comentário do contador para os erros didáticos previstos em docs/campanha.md.
 * Quando o erro não é um dos previstos, descreve o que a prévia mostra.
 */
function comentarDoContador(
  contabil: EstadoContabil,
  operacao: Operacao | null,
  informado: readonly Partida[],
  previa: NonNullable<Conferencia["previa"]>,
): Pick<Conferencia, "comentario" | "regras"> {
  const { contas, papeis } = contabil.planoDeContas;
  const usa = (conta: string) => informado.some((p) => p.conta === conta);
  const usaContaDeResultado = informado.some((p) => {
    const grupo = contas.find((c) => c.codigo === p.conta)?.grupo;
    return grupo === "custo" || grupo === "despesa_operacional";
  });
  const { comOSeuLancamento: seu, correto } = previa;
  const diferenca = (a: Centavos, b: Centavos) => formatarReais(Math.abs(a - b));

  if (operacao?.tipo === "recebimento_consignacao" || operacao?.tipo === "devolucao_consignacao") {
    return {
      comentario:
        "Esse fato não gera lançamento. A mercadoria em consignação é de quem a deixou aqui: a casa não comprou nada e ainda não deve nada. A compra só acontece quando uma unidade é vendida.",
      regras: [operacao.tipo === "recebimento_consignacao" ? "R-CSG-01" : "R-CSG-03"],
    };
  }

  if (!operacao) {
    return {
      comentario: `Esse fato não gera lançamento: nenhum dinheiro entrou e ninguém se comprometeu com nada. Com o seu lançamento, o Patrimônio Líquido apareceria ${diferenca(seu.patrimonioLiquidoCentavos, correto.patrimonioLiquidoCentavos)} maior do que é.`,
      regras: ["R-CAP-02"],
    };
  }

  if (operacao.tipo === "compra_imobilizado" && usa(papeis.estoque)) {
    return {
      comentario: `Esse bem é para uso da própria empresa, não para revenda. Em Estoque, o Ativo Circulante ficaria ${diferenca(seu.ativoCirculanteCentavos, correto.ativoCirculanteCentavos)} maior, como se o bem estivesse à venda. O lugar dele é o Imobilizado.`,
      regras: ["R-IMO-02", "R-IMO-05"],
    };
  }

  if (operacao.tipo === "compra" && usaContaDeResultado) {
    return {
      comentario: `Comprar mercadoria não é despesa: você trocou dinheiro (ou uma dívida) por estoque. Com o seu lançamento, o mês mostraria um prejuízo falso de ${diferenca(seu.resultadoDoMesCentavos, correto.resultadoDoMesCentavos)}. O custo só vai ao resultado quando a mercadoria é vendida.`,
      regras: ["R-COM-04"],
    };
  }

  if (operacao.tipo === "compra" && !usa(papeis.icmsARecuperar)) {
    return {
      comentario:
        "Você registrou o estoque pelo valor da nota. O ICMS já está dentro desse valor e é recuperável: ele sai do custo e vai para ICMS a Recuperar. Do seu jeito, o estoque fica superavaliado e o crédito do imposto se perde.",
      regras: ["R-COM-01", "R-ICMS-04"],
    };
  }

  if (operacao.tipo === "venda" && !usa(papeis.cmv)) {
    return {
      comentario: `Faltou baixar o estoque. Sem o Custo das Mercadorias Vendidas, o lucro apareceria ${diferenca(seu.resultadoDoMesCentavos, correto.resultadoDoMesCentavos)} maior do que é, e o estoque continuaria com mercadoria que já saiu da loja.`,
      regras: ["R-VEN-02"],
    };
  }

  if (operacao.tipo === "provisao_salarios" && (usa(papeis.caixa) || usa(papeis.bancos))) {
    return {
      comentario:
        "Aqui ainda não saiu dinheiro: você está reconhecendo a despesa do mês. A contrapartida é Salários a Pagar. O pagamento é outro lançamento, que vem depois.",
      regras: ["R-DES-01", "R-DES-02"],
    };
  }

  if (operacao.tipo === "pagamento" && usaContaDeResultado) {
    return {
      comentario: `Pagar uma obrigação que já estava registrada não é despesa nova: só diminui a dívida e o dinheiro. Com o seu lançamento, o resultado do mês ficaria ${diferenca(seu.resultadoDoMesCentavos, correto.resultadoDoMesCentavos)} pior do que é.`,
      regras: ["R-DES-01"],
    };
  }

  if (seu.resultadoDoMesCentavos !== correto.resultadoDoMesCentavos) {
    return {
      comentario: `Com o seu lançamento, o resultado do mês seria ${formatarReais(seu.resultadoDoMesCentavos)}, e o correto é ${formatarReais(correto.resultadoDoMesCentavos)}.`,
      regras: [],
    };
  }
  if (seu.totalDoAtivoCentavos !== correto.totalDoAtivoCentavos) {
    return {
      comentario: `Com o seu lançamento, o total do Ativo seria ${formatarReais(seu.totalDoAtivoCentavos)}, e o correto é ${formatarReais(correto.totalDoAtivoCentavos)}.`,
      regras: [],
    };
  }
  return {
    comentario:
      "O lançamento fecha, mas as contas ou os lados não correspondem ao que aconteceu. Veja as linhas marcadas.",
    regras: [],
  };
}
