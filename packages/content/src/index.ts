// Schemas zod, dados do jogo e carregador com validação (docs/modelo-de-conteudo.md).
import { type Conteudo, carregarConteudo } from "./carregar";
import { dadosBrutos } from "./dados";

export {
  type Conteudo,
  type ConteudoBruto,
  carregarConteudo,
  ErroDeConteudo,
  MINIMO_DE_AFIRMATIVAS_POR_CONCEITO,
  ordenarMissoes,
  placeholdersDe,
} from "./carregar";
export { dadosBrutos } from "./dados";
export { type ContextoDaOperacao, paraOperacaoDoMotor, parteDoAcionista } from "./operacoes";
export {
  ACIONISTA_AVATAR,
  type Afirmativa,
  afirmativaSchema,
  type Capitulo,
  type Conceito,
  capituloSchema,
  conceitoSchema,
  type Estabelecimento,
  estabelecimentoSchema,
  type Missao,
  missaoSchema,
  type Npc,
  npcSchema,
  type OperacaoDeMissao,
  operacaoSchema,
  PLACEHOLDERS,
  type Produto,
  type Proposta,
  produtoSchema,
  type Tema,
  TOTAL_EM_PONTOS_BASE,
  temaSchema,
} from "./schemas";

/** Carrega e valida o conteúdo embutido no jogo. Lança `ErroDeConteudo` se algo estiver errado. */
export function carregarConteudoDoJogo(): Conteudo {
  return carregarConteudo(dadosBrutos);
}
