// Motor contábil puro (sem Phaser, React, DOM ou I/O).
// O orquestrador e a UI só falam com o ledger por esta API (docs/arquitetura.md).

export {
  CATALOGO_DA_HAMBURGUERIA,
  CATALOGO_VAZIO,
  type Catalogo,
  type IngredienteDaReceita,
  type TipoDeItem,
  tipoDoItem,
} from "./catalogo";
export {
  compararLancamento,
  type LinhaComparada,
  type LinhaFaltante,
  type PreviaDoErro,
  type ResultadoComparacao,
  type SituacaoDaLinha,
  simularLancamentoInformado,
} from "./comparacao";
export type { DataJogo, MesJogo, Periodo } from "./data";
export {
  type BalancoPatrimonial,
  balanco,
  type DRE,
  dre,
  type LinhaDeDemonstracao,
  type LinhaDoImobilizado,
} from "./demonstracoes";
export type { Centavos, PontosBase } from "./dinheiro";
export { type CodigoErro, ErroDeOperacao } from "./erros";
export {
  aplicar,
  apurarIcms,
  apurarIpi,
  criarEmpresa,
  depreciarMes,
  type ParametrosDaEmpresa,
  preverLancamentos,
} from "./motor";
export { NOTAS_DIDATICAS, PARAMETROS_PADRAO, type Parametros } from "./parametros";
export {
  type ClasseDepreciavel,
  type ClasseImobilizado,
  type CodigoConta,
  type Conta,
  type GrupoConta,
  type Natureza,
  type PapeisDeContas,
  PLANO_DE_CONTAS_V1,
  type PlanoDeContas,
} from "./plano-de-contas";
export {
  type Balancete,
  balancete,
  type LinhaDoBalancete,
  type Saldo,
  saldos,
} from "./razao";
export { type IdRegra, REGRAS } from "./regras";
export type {
  Bem,
  CondicaoDeCompra,
  CondicaoDeVenda,
  EstadoContabil,
  ItemDevolvido,
  ItemImobilizado,
  ItemMercadoria,
  Lado,
  Lancamento,
  LinhaDeNota,
  MeioDePagamento,
  NotaRegistrada,
  ObrigacaoPagavel,
  Operacao,
  Partida,
  Previsao,
  SaldoConsignado,
  SaldoDeEstoque,
  TipoOperacao,
  ValoresCalculados,
} from "./tipos";
