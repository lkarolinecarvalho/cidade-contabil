import type { Afirmativa, Missao } from "@cidade/content";

/** Máximo de afirmativas numa operação comum (docs/fluxo-afirmativas.md, seção 1). */
export const LIMITE_POR_OPERACAO = 2;
/** Máximo no fechamento do mês (docs/fluxo-afirmativas.md, seção 2). */
export const LIMITE_NO_FECHAMENTO = 4;

/** A missão que apura o ICMS é o fechamento do mês: cobra as afirmativas de fechamento. */
function ehFechamento(missao: Missao): boolean {
  return missao.operacoes.some((operacao) => operacao.tipo === "apuracao_icms");
}

export function limiteDeAfirmativas(missao: Missao): number {
  return ehFechamento(missao) ? LIMITE_NO_FECHAMENTO : LIMITE_POR_OPERACAO;
}

/**
 * Escolhe as afirmativas de uma missão: uma por conceito, na ordem dos conceitos da
 * missão, só as liberadas para o nível e para o momento, preferindo a variante menos
 * vista. A repetição espaçada (caixas de Leitner) entra no M7.
 */
export function selecionarAfirmativas(
  missao: Missao,
  afirmativas: readonly Afirmativa[],
  vistas: Readonly<Record<string, number>>,
): Afirmativa[] {
  const momento = ehFechamento(missao) ? "fechamento_mes" : "pos_operacao";
  const limite = limiteDeAfirmativas(missao);
  const escolhidas: Afirmativa[] = [];
  for (const conceito of missao.conceitos) {
    if (escolhidas.length >= limite) break;
    const candidatas = afirmativas
      .filter(
        (a) =>
          a.conceitoId === conceito && a.nivelMin <= missao.nivel && a.momentos.includes(momento),
      )
      // Menos vista primeiro; no empate, a ordem do conteúdo (sort é estável).
      .sort((a, b) => (vistas[a.id] ?? 0) - (vistas[b.id] ?? 0));
    const [melhor] = candidatas;
    if (melhor) escolhidas.push(melhor);
  }
  return escolhidas;
}
