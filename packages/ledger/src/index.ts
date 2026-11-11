// Motor contábil puro (sem Phaser, React, DOM ou I/O).
// O orquestrador e a UI só falam com o ledger por esta API (docs/arquitetura.md).

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
  ItemImobilizado,
  ItemMercadoria,
  Lado,
  Lancamento,
  MeioDePagamento,
  ObrigacaoPagavel,
  Operacao,
  Partida,
  Previsao,
  SaldoDeEstoque,
  TipoOperacao,
  ValoresCalculados,
} from "./tipos";
