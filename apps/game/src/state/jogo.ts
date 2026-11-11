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
  /**
   * Missão começada e ainda não concluída: quantas operações dela já foram gravadas.
   * Evita gravar a mesma operação duas vezes se o jogador fechar o painel no meio.
   */
  readonly andamento: { readonly missao: string; readonly operacoesExecutadas: number } | null;
  /** Quantas vezes cada afirmativa já foi mostrada, para variar a redação. */
  readonly afirmativasVistas: Readonly<Record<string, number>>;
}

/** Pontos por afirmativa certa (parâmetro de balanceamento). */
export const PONTOS_POR_AFIRMATIVA = 10;

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
    andamento: null,
    afirmativasVistas: {},
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

function exigirMissaoDisponivel(estado: EstadoDoJogo, missao: Missao): void {
  if (estado.missoesConcluidas.includes(missao.id)) {
    throw new ErroDeJogo("Essa missão já foi concluída.");
  }
  const pendente = missao.requisitos.find((r) => !estado.missoesConcluidas.includes(r));
  if (pendente) throw new ErroDeJogo("Conclua antes as missões anteriores.");
}

/** Quantas operações da missão já foram gravadas no razão. */
export function operacoesExecutadas(
  estado: Pick<EstadoDoJogo, "andamento">,
  missao: Missao,
): number {
  return estado.andamento?.missao === missao.id ? estado.andamento.operacoesExecutadas : 0;
}

/**
 * Grava a próxima operação pendente da missão. O razão recebe sempre os lançamentos
 * do motor, qualquer que tenha sido o lançamento montado pelo jogador (ADR-0005).
 */
export function executarProximaOperacao(
  estado: EstadoDoJogo,
  missao: Missao,
  opcoes: OpcoesDaOperacao = {},
): EstadoDoJogo {
  exigirMissaoDisponivel(estado, missao);
  const feitas = operacoesExecutadas(estado, missao);
  const operacao = missao.operacoes[feitas];
  if (!operacao) throw new ErroDeJogo("Todas as operações dessa missão já foram feitas.");
  return {
    ...executarOperacao(estado, operacao, opcoes),
    andamento: { missao: missao.id, operacoesExecutadas: feitas + 1 },
  };
}

/** Conclui a missão, depois de todas as operações gravadas, e soma os pontos. */
export function concluirMissao(estado: EstadoDoJogo, missao: Missao): EstadoDoJogo {
  exigirMissaoDisponivel(estado, missao);
  if (operacoesExecutadas(estado, missao) < missao.operacoes.length) {
    throw new ErroDeJogo("Ainda há operações dessa missão por fazer.");
  }
  return {
    ...estado,
    pontos: estado.pontos + missao.recompensa.pontos,
    missoesConcluidas: [...estado.missoesConcluidas, missao.id],
    andamento: null,
  };
}

/** Faz a missão inteira de uma vez: todas as operações pendentes e a conclusão. */
export function jogarMissaoInteira(
  estado: EstadoDoJogo,
  missao: Missao,
  opcoes: OpcoesDaOperacao = {},
): EstadoDoJogo {
  let atual = estado;
  while (operacoesExecutadas(atual, missao) < missao.operacoes.length) {
    atual = executarProximaOperacao(atual, missao, opcoes);
  }
  return concluirMissao(atual, missao);
}

/** Registra a resposta a uma afirmativa: conta a exibição e pontua o acerto. */
export function registrarResposta(
  estado: EstadoDoJogo,
  afirmativa: string,
  acertou: boolean,
): EstadoDoJogo {
  return {
    ...estado,
    pontos: estado.pontos + (acertou ? PONTOS_POR_AFIRMATIVA : 0),
    afirmativasVistas: {
      ...estado.afirmativasVistas,
      [afirmativa]: (estado.afirmativasVistas[afirmativa] ?? 0) + 1,
    },
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
