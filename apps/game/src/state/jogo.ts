import {
  ACIONISTA_AVATAR,
  type Afirmativa,
  type Missao,
  type OperacaoDeMissao,
  paraOperacaoDoMotor,
  parteDoAcionista,
} from "@cidade/content";
import {
  type Centavos,
  criarEmpresa,
  type DataJogo,
  type EstadoContabil,
  type MeioDePagamento,
  type Operacao,
  preverLancamentos,
  saldos,
} from "@cidade/ledger";
import {
  ACOES_POR_DIA,
  baixarTitulos,
  chaveDoMes,
  compararDatas,
  DIAS_NO_MES,
  ehUltimoDiaDoMes,
  somarDias,
  type Titulo,
} from "./calendario";
import { atualizarEstudo, type Estudo, type Resultado } from "./estudo";

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
  /** Operações já feitas no dia corrente (limite: `ACOES_POR_DIA`). */
  readonly acoesUsadasHoje: number;
  /** Títulos a pagar e a receber, com vencimento no calendário do jogo. */
  readonly titulos: readonly Titulo[];
  /** Meses em que a apuração do ICMS já foi feita (`chaveDoMes`). */
  readonly mesesFechados: readonly string[];
  /** ICMS apurado com saldo devedor, a pagar no Posto Fiscal (R-ICMS-06). */
  readonly icmsAPagarCentavos: Centavos;
  readonly missoesConcluidas: readonly string[];
  /**
   * Missão começada e ainda não concluída: quantas operações dela já foram gravadas.
   * Evita gravar a mesma operação duas vezes se o jogador fechar o painel no meio.
   */
  readonly andamento: { readonly missao: string; readonly operacoesExecutadas: number } | null;
  /** Quantas vezes cada afirmativa já foi mostrada, para variar a redação. */
  readonly afirmativasVistas: Readonly<Record<string, number>>;
  /** Repetição espaçada: a caixa de Leitner de cada conceito já cobrado. */
  readonly estudo: Estudo;
  /** Modo banca (estilo CEBRASPE): acerto +1, erro −1, branco 0. Desligado por padrão. */
  readonly modoBanca: boolean;
  /** Placar líquido do modo banca nesta sessão. */
  readonly placarBanca: number;
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
    acoesUsadasHoje: 0,
    titulos: [],
    mesesFechados: [],
    icmsAPagarCentavos: 0,
    missoesConcluidas: [],
    andamento: null,
    afirmativasVistas: {},
    estudo: {},
    modoBanca: false,
    placarBanca: 0,
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

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------

export function acoesRestantes(estado: Pick<EstadoDoJogo, "acoesUsadasHoje">): number {
  return Math.max(ACOES_POR_DIA - estado.acoesUsadasHoje, 0);
}

export function mesFechado(estado: Pick<EstadoDoJogo, "mesesFechados" | "data">): boolean {
  return estado.mesesFechados.includes(chaveDoMes(estado.data));
}

function consumirAcao(estado: EstadoDoJogo): EstadoDoJogo {
  if (acoesRestantes(estado) === 0) {
    throw new ErroDeJogo("Você já usou todas as ações de hoje. Encerre o dia para continuar.");
  }
  return { ...estado, acoesUsadasHoje: estado.acoesUsadasHoje + 1 };
}

/**
 * Encerra o dia e renova as ações. No último dia do mês, o mês só vira depois do
 * fechamento (depreciação e apuração do ICMS).
 */
export function encerrarDia(estado: EstadoDoJogo): EstadoDoJogo {
  if (ehUltimoDiaDoMes(estado.data) && !mesFechado(estado)) {
    throw new ErroDeJogo(
      "Antes de virar o mês, faça o fechamento: a depreciação e a apuração do ICMS.",
    );
  }
  return { ...estado, data: somarDias(estado.data, 1), acoesUsadasHoje: 0 };
}

/** Avança direto para o último dia do mês corrente. */
export function irParaOUltimoDia(estado: EstadoDoJogo): EstadoDoJogo {
  if (ehUltimoDiaDoMes(estado.data)) return estado;
  return { ...estado, data: { ...estado.data, dia: DIAS_NO_MES }, acoesUsadasHoje: 0 };
}

/** Missão de fechamento do mês: só pode ser feita no último dia. */
export function missaoDeFechamento(missao: Missao): boolean {
  return missao.operacoes.some((o) => o.tipo === "depreciacao" || o.tipo === "apuracao_icms");
}

export function missaoDisponivelHoje(missao: Missao, data: DataJogo): boolean {
  return !missaoDeFechamento(missao) || ehUltimoDiaDoMes(data);
}

// ---------------------------------------------------------------------------
// Operações
// ---------------------------------------------------------------------------

/**
 * Grava uma operação pelo motor e atualiza o que o jogo acompanha por fora do razão:
 * títulos com vencimento e o fechamento do mês.
 */
function aplicarNoMotor(estado: EstadoDoJogo, operacao: Operacao): EstadoDoJogo {
  const { data } = estado;
  if (
    (operacao.tipo === "depreciacao" || operacao.tipo === "apuracao_icms") &&
    !ehUltimoDiaDoMes(data)
  ) {
    throw new ErroDeJogo(`O fechamento do mês é feito no último dia (dia ${DIAS_NO_MES}).`);
  }

  const { novoEstado: contabil, valores } = preverLancamentos(estado.contabil, operacao, data);
  let { titulos, mesesFechados, icmsAPagarCentavos } = estado;
  const novoTitulo = (
    tipo: Titulo["tipo"],
    descricao: string,
    valorCentavos: Centavos,
    dias: number,
  ) => {
    titulos = [
      ...titulos,
      {
        id: titulos.length + 1,
        tipo,
        descricao,
        valorCentavos,
        saldoCentavos: valorCentavos,
        emissao: data,
        vencimento: somarDias(data, dias),
      },
    ];
  };

  if (operacao.tipo === "compra" && operacao.condicao.tipo === "prazo") {
    novoTitulo("pagar", "Fornecedor", valores.totalNota ?? 0, operacao.condicao.dias);
  }
  if (operacao.tipo === "venda" && operacao.condicao.tipo === "prazo") {
    novoTitulo("receber", "Cliente", valores.receitaBruta ?? 0, operacao.condicao.dias);
  }
  if (operacao.tipo === "pagamento" && operacao.obrigacao === "fornecedores") {
    titulos = baixarTitulos(titulos, "pagar", operacao.valorCentavos);
  }
  if (operacao.tipo === "recebimento") {
    titulos = baixarTitulos(titulos, "receber", operacao.valorCentavos);
  }
  if (operacao.tipo === "pagamento" && operacao.obrigacao === "icms") {
    icmsAPagarCentavos = Math.max(icmsAPagarCentavos - operacao.valorCentavos, 0);
  }
  if (operacao.tipo === "apuracao_icms") {
    mesesFechados = [...mesesFechados, chaveDoMes(data)];
    // R-ICMS-06: o saldo devedor que sobra depois da compensação é pago no Posto Fiscal.
    icmsAPagarCentavos = saldoDaConta(contabil, contabil.planoDeContas.papeis.icmsARecolher);
  }
  return { ...estado, contabil, titulos, mesesFechados, icmsAPagarCentavos };
}

function saldoDaConta(contabil: EstadoContabil, conta: string): Centavos {
  return saldos(contabil).find((saldo) => saldo.conta === conta)?.saldoCentavos ?? 0;
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

  return aplicarNoMotor(
    { ...estado, carteiraCentavos, participacoes },
    paraOperacaoDoMotor(operacao, { mes: estado.data, ...opcoes }),
  );
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
 * Grava a próxima operação pendente da missão, gastando uma ação do dia. O razão recebe
 * sempre os lançamentos do motor, qualquer que tenha sido o lançamento do jogador (ADR-0005).
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
    ...executarOperacao(consumirAcao(estado), operacao, opcoes),
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

/**
 * Deixa o calendário pronto para a próxima operação da missão: vai ao último dia se
 * for o fechamento e encerra o dia se as ações acabaram. Usado para jogar no automático.
 */
export function prepararParaOperacao(estado: EstadoDoJogo, missao: Missao): EstadoDoJogo {
  let atual = estado;
  if (missaoDeFechamento(missao)) atual = irParaOUltimoDia(atual);
  if (acoesRestantes(atual) === 0) atual = encerrarDia(atual);
  return atual;
}

/** Faz a missão inteira no automático: calendário, operações pendentes e conclusão. */
export function jogarMissaoInteira(
  estado: EstadoDoJogo,
  missao: Missao,
  opcoes: OpcoesDaOperacao = {},
): EstadoDoJogo {
  let atual = estado;
  while (operacoesExecutadas(atual, missao) < missao.operacoes.length) {
    atual = executarProximaOperacao(prepararParaOperacao(atual, missao), missao, opcoes);
  }
  return concluirMissao(atual, missao);
}

/** Resposta do jogador a uma afirmativa: Certo, Errado ou em branco (só no modo banca). */
export type Resposta = "C" | "E" | null;

export function resultadoDaResposta(afirmativa: Afirmativa, resposta: Resposta): Resultado {
  if (resposta === null) return "branco";
  return resposta === afirmativa.gabarito ? "acerto" : "erro";
}

/**
 * Registra a resposta a uma afirmativa: conta a exibição, move o conceito entre as
 * caixas de Leitner e pontua. Fora do modo banca, só o acerto pontua; no modo banca,
 * o placar líquido soma +1, −1 ou 0 e os pontos normais não mudam.
 */
export function registrarResposta(
  estado: EstadoDoJogo,
  afirmativa: Afirmativa,
  resposta: Resposta,
): EstadoDoJogo {
  const resultado = resultadoDaResposta(afirmativa, resposta);
  const naBanca = resultado === "acerto" ? 1 : resultado === "erro" ? -1 : 0;
  return {
    ...estado,
    pontos:
      estado.pontos + (!estado.modoBanca && resultado === "acerto" ? PONTOS_POR_AFIRMATIVA : 0),
    placarBanca: estado.placarBanca + (estado.modoBanca ? naBanca : 0),
    afirmativasVistas: {
      ...estado.afirmativasVistas,
      [afirmativa.id]: (estado.afirmativasVistas[afirmativa.id] ?? 0) + 1,
    },
    estudo: {
      ...estado.estudo,
      [afirmativa.conceitoId]: atualizarEstudo(
        estado.estudo[afirmativa.conceitoId],
        resultado,
        estado.data,
        estado.modoBanca,
      ),
    },
  };
}

export function definirModoBanca(estado: EstadoDoJogo, ligado: boolean): EstadoDoJogo {
  return { ...estado, modoBanca: ligado };
}

// ---------------------------------------------------------------------------
// Ações fora das missões: títulos, ICMS e fechamento do mês
// ---------------------------------------------------------------------------

/** Paga ou recebe o saldo de um título, pelo banco. Gasta uma ação do dia. */
export function liquidarTitulo(estado: EstadoDoJogo, id: number): EstadoDoJogo {
  const titulo = estado.titulos.find((t) => t.id === id);
  if (!titulo || titulo.saldoCentavos === 0) throw new ErroDeJogo("Esse título já foi quitado.");
  if (titulo.tipo === "receber" && compararDatas(estado.data, titulo.vencimento) < 0) {
    throw new ErroDeJogo("O cliente só paga no vencimento.");
  }
  const operacao: Operacao =
    titulo.tipo === "pagar"
      ? {
          tipo: "pagamento",
          obrigacao: "fornecedores",
          valorCentavos: titulo.saldoCentavos,
          meio: "bancos",
        }
      : { tipo: "recebimento", valorCentavos: titulo.saldoCentavos, meio: "bancos" };
  const depois = aplicarNoMotor(consumirAcao(estado), operacao);
  // A baixa é deste título, não do mais antigo.
  return {
    ...depois,
    titulos: estado.titulos.map((t) => (t.id === id ? { ...t, saldoCentavos: 0 } : t)),
  };
}

/** Paga no Posto Fiscal, pelo banco, o ICMS apurado com saldo devedor (R-ICMS-06). */
export function pagarIcms(estado: EstadoDoJogo): EstadoDoJogo {
  if (estado.icmsAPagarCentavos === 0) throw new ErroDeJogo("Não há ICMS apurado a pagar.");
  return aplicarNoMotor(consumirAcao(estado), {
    tipo: "pagamento",
    obrigacao: "icms",
    valorCentavos: estado.icmsAPagarCentavos,
    meio: "bancos",
  });
}

/**
 * Fechamento do mês fora da campanha: lança a depreciação (se ainda não foi) e apura
 * o ICMS, direto pelo motor. Na campanha, o fechamento é feito pelas missões do capítulo 7.
 */
export function fecharMes(estado: EstadoDoJogo): EstadoDoJogo {
  if (!ehUltimoDiaDoMes(estado.data)) {
    throw new ErroDeJogo(`O fechamento do mês é feito no último dia (dia ${DIAS_NO_MES}).`);
  }
  if (mesFechado(estado)) throw new ErroDeJogo("Este mês já foi fechado.");
  const mes = { ano: estado.data.ano, mes: estado.data.mes };
  const depreciado = estado.contabil.lancamentos.some(
    (l) => l.operacao === "depreciacao" && l.data.ano === mes.ano && l.data.mes === mes.mes,
  );
  const comDepreciacao = depreciado ? estado : aplicarNoMotor(estado, { tipo: "depreciacao", mes });
  return aplicarNoMotor(comDepreciacao, { tipo: "apuracao_icms", mes });
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

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

/** Saldo da conta Caixa da empresa, lido do razão. */
export function caixaDaEmpresa(contabil: EstadoContabil): Centavos {
  return saldoDaConta(contabil, contabil.planoDeContas.papeis.caixa);
}

/** Saldo da conta Bancos da empresa, lido do razão. */
export function bancosDaEmpresa(contabil: EstadoContabil): Centavos {
  return saldoDaConta(contabil, contabil.planoDeContas.papeis.bancos);
}

/** Caixa + Bancos da empresa, lidos do razão. */
export function disponibilidadesDaEmpresa(contabil: EstadoContabil): Centavos {
  const { caixa, bancos } = contabil.planoDeContas.papeis;
  return saldoDaConta(contabil, caixa) + saldoDaConta(contabil, bancos);
}
