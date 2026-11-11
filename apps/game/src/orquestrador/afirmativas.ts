import type { Afirmativa, Missao } from "@cidade/content";
import { compararPrioridade, conceitoVencido } from "../state/estudo";
import type { EstadoDoJogo } from "../state/jogo";

/** Máximo de afirmativas numa operação comum (docs/fluxo-afirmativas.md, seção 1). */
export const LIMITE_POR_OPERACAO = 2;
/** Máximo no fechamento do mês (docs/fluxo-afirmativas.md, seção 2). */
export const LIMITE_NO_FECHAMENTO = 4;
/** Tamanho de uma bateria de Revisão no Escritório (parâmetro de balanceamento). */
export const LIMITE_NA_REVISAO = 10;

type Momento = Afirmativa["momentos"][number];
type EstadoDoEstudo = Pick<EstadoDoJogo, "afirmativasVistas" | "estudo" | "data">;

/** A missão que apura o ICMS é o fechamento do mês: cobra as afirmativas de fechamento. */
function ehFechamento(missao: Missao): boolean {
  return missao.operacoes.some((operacao) => operacao.tipo === "apuracao_icms");
}

export function limiteDeAfirmativas(missao: Missao): number {
  return ehFechamento(missao) ? LIMITE_NO_FECHAMENTO : LIMITE_POR_OPERACAO;
}

/**
 * Seleção de docs/fluxo-afirmativas.md, seção 3: dos conceitos informados, ficam os
 * vencidos no espaçamento, em ordem de prioridade (caixa mais baixa, revisão mais
 * atrasada); de cada um, a variante liberada para o nível e o momento que foi menos vista.
 */
function selecionar(
  conceitos: readonly string[],
  afirmativas: readonly Afirmativa[],
  estado: EstadoDoEstudo,
  filtro: { readonly nivel: number; readonly momento: Momento; readonly limite: number },
): Afirmativa[] {
  const vencidos = [...new Set(conceitos)]
    .filter((conceito) => conceitoVencido(estado.estudo[conceito], estado.data))
    // sort é estável: no empate, vale a ordem em que os conceitos foram informados.
    .sort((a, b) => compararPrioridade(estado.estudo[a], estado.estudo[b]));

  const escolhidas: Afirmativa[] = [];
  for (const conceito of vencidos) {
    if (escolhidas.length >= filtro.limite) break;
    const [menosVista] = afirmativas
      .filter(
        (a) =>
          a.conceitoId === conceito &&
          a.nivelMin <= filtro.nivel &&
          a.momentos.includes(filtro.momento),
      )
      .sort(
        (a, b) => (estado.afirmativasVistas[a.id] ?? 0) - (estado.afirmativasVistas[b.id] ?? 0),
      );
    if (menosVista) escolhidas.push(menosVista);
  }
  return escolhidas;
}

/**
 * Afirmativas de uma missão. Pode voltar vazio: quando nenhum conceito da operação
 * está vencido, a operação termina sem afirmativa, e isso é desejável.
 */
export function selecionarAfirmativas(
  missao: Missao,
  afirmativas: readonly Afirmativa[],
  estado: EstadoDoEstudo,
): Afirmativa[] {
  return selecionar(missao.conceitos, afirmativas, estado, {
    nivel: missao.nivel,
    momento: ehFechamento(missao) ? "fechamento_mes" : "pos_operacao",
    limite: limiteDeAfirmativas(missao),
  });
}

/**
 * Bateria de Revisão: os conceitos que o jogador já encontrou e que estão vencidos.
 * Conceito ainda não apresentado pela campanha não entra.
 */
export function selecionarParaRevisao(
  afirmativas: readonly Afirmativa[],
  estado: EstadoDoEstudo,
  nivel: number,
  limite = LIMITE_NA_REVISAO,
): Afirmativa[] {
  return selecionar(Object.keys(estado.estudo), afirmativas, estado, {
    nivel,
    momento: "revisao",
    limite,
  });
}
