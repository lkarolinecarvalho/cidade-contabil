import {
  ACIONISTA_AVATAR,
  type Missao,
  type OperacaoDeMissao,
  paraOperacaoDoMotor,
  parteDoAcionista,
} from "@cidade/content";
import {
  aplicar,
  type Centavos,
  criarEmpresa,
  type DataJogo,
  type EstadoContabil,
  type MeioDePagamento,
  saldos,
} from "@cidade/ledger";

/**
 * Estado do jogo e as regras que não são contábeis. Funções puras: a store só guarda
 * o resultado. A contabilidade fica toda em `contabil`, calculada pelo ledger.
 */
export interface EstadoDoJogo {
  readonly versaoSchema: 1;
  /** Razão, estoque e imobilizado da empresa. */
  readonly contabil: EstadoContabil;
  /**
   * Dinheiro da pessoa física do avatar. Fica **fora** do razão (ADR-0004, R-ENT-01):
   * nenhuma função daqui o mistura com `contabil`.
   */
  readonly carteiraCentavos: Centavos;
  /** Parte de cada acionista no capital, em pontos-base (R-CAP-05). */
  readonly participacoes: Readonly<Record<string, number>>;
  readonly pontos: number;
  readonly data: DataJogo;
  readonly missoesConcluidas: readonly string[];
}

/** Carteira inicial do avatar (docs/cenario-campanha.md). */
export const CARTEIRA_INICIAL: Centavos = 28_000_000;

export function novoJogo(): EstadoDoJogo {
  return {
    versaoSchema: 1,
    contabil: criarEmpresa(),
    carteiraCentavos: CARTEIRA_INICIAL,
    participacoes: {},
    pontos: 0,
    data: { ano: 1, mes: 1, dia: 1 },
    missoesConcluidas: [],
  };
}

/** Ação bloqueada por uma regra do jogo (não contábil). */
export class ErroDeJogo extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroDeJogo";
  }
}

export interface OpcoesDaOperacao {
  /** Meio escolhido pelo jogador, quando a missão deixa a escolha com ele. */
  readonly meioEscolhido?: MeioDePagamento;
}

/**
 * Executa uma operação de missão: o ledger grava os lançamentos do motor, e a
 * carteira pessoal acompanha por fora quando o avatar integraliza capital.
 * Lança `ErroDeOperacao` (regra contábil) ou `ErroDeJogo`; nesse caso nada muda.
 */
export function executarOperacao(
  estado: EstadoDoJogo,
  operacao: OperacaoDeMissao,
  opcoes: OpcoesDaOperacao = {},
): EstadoDoJogo {
  let { carteiraCentavos, participacoes } = estado;

  if (operacao.tipo === "subscricao") participacoes = operacao.participacoes;

  if (operacao.tipo === "integralizacao") {
    // R-ENT-02: a carteira diminui só pela parte do avatar; o NPC integraliza a dele.
    const parteDoAvatar = parteDoAcionista(
      operacao.valorCentavos,
      participacoes[ACIONISTA_AVATAR] ?? 0,
    );
    if (parteDoAvatar > carteiraCentavos) {
      throw new ErroDeJogo("Sua carteira não tem saldo para integralizar esse valor.");
    }
    carteiraCentavos -= parteDoAvatar;
  }

  const contabil = aplicar(
    estado.contabil,
    paraOperacaoDoMotor(operacao, { mes: estado.data, ...opcoes }),
    estado.data,
  );
  return { ...estado, contabil, carteiraCentavos, participacoes };
}

/** Conclui a missão: executa as operações em ordem e soma os pontos. Tudo ou nada. */
export function concluirMissao(
  estado: EstadoDoJogo,
  missao: Missao,
  opcoes: OpcoesDaOperacao = {},
): EstadoDoJogo {
  if (estado.missoesConcluidas.includes(missao.id)) {
    throw new ErroDeJogo("Essa missão já foi concluída.");
  }
  const pendente = missao.requisitos.find((r) => !estado.missoesConcluidas.includes(r));
  if (pendente) throw new ErroDeJogo("Conclua antes as missões anteriores.");

  const depois = missao.operacoes.reduce(
    (atual, operacao) => executarOperacao(atual, operacao, opcoes),
    estado,
  );
  return {
    ...depois,
    pontos: depois.pontos + missao.recompensa.pontos,
    missoesConcluidas: [...depois.missoesConcluidas, missao.id],
  };
}

/** Próxima missão que o jogador pode fazer, na ordem do conteúdo. */
export function proximaMissao(
  estado: Pick<EstadoDoJogo, "missoesConcluidas">,
  missoes: readonly Missao[],
): Missao | undefined {
  return missoes.find(
    (m) =>
      !estado.missoesConcluidas.includes(m.id) &&
      m.requisitos.every((r) => estado.missoesConcluidas.includes(r)),
  );
}

/** Nível do jogador: o da missão em que ele está (GDD, seção 9). */
export function nivelDoJogador(
  estado: Pick<EstadoDoJogo, "missoesConcluidas">,
  missoes: readonly Missao[],
): number {
  return proximaMissao(estado, missoes)?.nivel ?? missoes.at(-1)?.nivel ?? 1;
}

/** Caixa + Bancos da empresa, lidos do razão. */
export function disponibilidadesDaEmpresa(contabil: EstadoContabil): Centavos {
  const { caixa, bancos } = contabil.planoDeContas.papeis;
  return saldos(contabil)
    .filter((saldo) => saldo.conta === caixa || saldo.conta === bancos)
    .reduce((total, saldo) => total + saldo.saldoCentavos, 0);
}
