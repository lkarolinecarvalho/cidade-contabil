import { type Missao, paraOperacaoDoMotor } from "@cidade/content";
import {
  ErroDeOperacao,
  type Lancamento,
  type Operacao,
  type Partida,
  preverLancamentos,
} from "@cidade/ledger";
import { useMemo, useState } from "react";
import { selecionarAfirmativas } from "../orquestrador/afirmativas";
import { type Direcao, efeitoDosLancamentos, rotuloDoGrupo } from "../orquestrador/efeito";
import {
  ajudaDaMissao,
  type Conferencia,
  conferirLancamento,
  linhasEsperadas,
} from "../orquestrador/lancamento";
import { acoesRestantes, operacoesExecutadas } from "../state/jogo";
import { conteudo, jogoStore, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { JulgarAfirmativas } from "./Afirmativas";
import { PainelDaDre } from "./Demonstracoes";
import { EditorDeLancamento } from "./EditorDeLancamento";
import { IconeCerto, IconeEstrela, Retrato } from "./icones";
import { RegraCitada } from "./RegraCitada";

type Etapa = "negociacao" | "efeito" | "afirmativas" | "lancamento" | "conclusao";

function Passos({ etapa, temEfeito }: { readonly etapa: Etapa; readonly temEfeito: boolean }) {
  const passos: readonly (readonly [Etapa, string])[] = [
    ...(temEfeito ? ([["efeito", "Efeito"]] as const) : []),
    ["afirmativas", "Afirmativas"],
    ["lancamento", "Lançamento"],
  ];
  if (etapa === "negociacao" || etapa === "conclusao") return null;
  return (
    <ol className="passos">
      {passos.map(([id, nome], indice) => (
        <li key={id} className={id === etapa ? "atual" : undefined}>
          <span>{indice + 1}</span>
          {nome}
        </li>
      ))}
    </ol>
  );
}

/**
 * Ciclo da missão: negociação → efeito → afirmativas → lançamento → conclusão.
 * O razão só recebe os lançamentos do motor, gravados quando cada operação termina.
 */
export function FluxoDaMissao({ missao }: { readonly missao: Missao }) {
  const feitas = useJogo((jogo) => operacoesExecutadas(jogo, missao));
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const semAcoes = useJogo((jogo) => acoesRestantes(jogo) === 0);
  const npc = conteudo.npcs.find((n) => n.id === missao.npc);

  // Escolhidas uma vez, ao abrir a missão.
  const [afirmativas] = useState(() =>
    selecionarAfirmativas(missao, conteudo.afirmativas, jogoStore.getState()),
  );
  const [afirmativasFeitas, setAfirmativasFeitas] = useState(feitas > 0);
  const [etapa, setEtapa] = useState<Etapa>(() => {
    if (feitas === 0) return "negociacao";
    return feitas < missao.operacoes.length ? "efeito" : "conclusao";
  });

  // Operação atual e o que o motor espera dela. Nada é gravado aqui.
  const previsao = useMemo(() => {
    const operacaoDaMissao = missao.operacoes[feitas];
    if (!operacaoDaMissao) {
      return { operacao: null, lancamentos: [] as readonly Lancamento[], valores: undefined };
    }
    try {
      const operacao = paraOperacaoDoMotor(operacaoDaMissao, { mes: data });
      const { lancamentos, valores } = preverLancamentos(contabil, operacao, data);
      return { operacao, lancamentos, valores };
    } catch (erro) {
      if (erro instanceof ErroDeOperacao) return { bloqueio: erro.message };
      throw erro;
    }
  }, [missao, feitas, contabil, data]);

  if ("bloqueio" in previsao) {
    return (
      <div className="cartao">
        <p className="painel-erro" role="alert">
          Não é possível fazer essa operação agora. {previsao.bloqueio}
        </p>
      </div>
    );
  }
  const { operacao, lancamentos, valores } = previsao;
  const temEfeito = lancamentos.length > 0;

  // Há operação por fazer e as ações do dia acabaram: só amanhã.
  if (operacao && semAcoes) {
    return (
      <div className="cartao">
        <p className="painel-sobretitulo">Capítulo {missao.capitulo}</p>
        <h3>{missao.titulo}</h3>
        <p className="painel-texto">
          Você já usou todas as ações de hoje. Abra o <strong>Calendário</strong> e encerre o dia
          para continuar.
        </p>
      </div>
    );
  }

  /** Depois da negociação e depois de cada operação gravada. */
  const etapaDaOperacao = (restantes: boolean): Etapa => {
    if (restantes) return "efeito";
    return afirmativasFeitas || afirmativas.length === 0 ? "conclusao" : "afirmativas";
  };

  const aposNegociacao = () => {
    // Fato sem lançamento: primeiro a decisão, depois as afirmativas (que dariam a resposta).
    if (!temEfeito) return setEtapa("lancamento");
    setEtapa("efeito");
  };
  const aposEfeito = () =>
    setEtapa(afirmativasFeitas || afirmativas.length === 0 ? "lancamento" : "afirmativas");
  const aposAfirmativas = () => {
    setAfirmativasFeitas(true);
    setEtapa(temEfeito ? "lancamento" : "conclusao");
  };
  const aposLancamento = () => {
    if (operacao) jogoStore.getState().executarProximaOperacao(missao);
    const proximas = feitas + (operacao ? 1 : 0) < missao.operacoes.length;
    setEtapa(etapaDaOperacao(proximas));
  };

  return (
    <article className="painel-missao">
      <p className="painel-sobretitulo">
        Capítulo {missao.capitulo}
        {missao.operacoes.length > 1 && etapa !== "negociacao" && etapa !== "conclusao"
          ? ` · Operação ${Math.min(feitas + 1, missao.operacoes.length)} de ${missao.operacoes.length}`
          : ""}
      </p>
      <h3>{missao.titulo}</h3>
      <Passos etapa={etapa} temEfeito={temEfeito} />

      {etapa === "negociacao" && (
        <>
          <div className="conversa">
            <div className="conversa-quem">
              <Retrato personagem={missao.npc} nome={npc?.nome ?? ""} />
              <strong>{npc?.nome}</strong>
              <span>{npc?.papel}</span>
            </div>
            <div className="conversa-falas">
              {missao.dialogo.map((fala) => (
                <p key={fala.texto} className="balao">
                  {fala.texto}
                </p>
              ))}
            </div>
          </div>
          <button type="button" className="botao-principal" onClick={aposNegociacao}>
            <IconeCerto />
            {temEfeito ? "Aceitar a proposta" : "Responder"}
          </button>
        </>
      )}

      {etapa === "efeito" && (
        <EtapaDoEfeito
          // Recomeça do zero a cada operação.
          key={feitas}
          lancamentos={lancamentos}
          aoContinuar={aposEfeito}
        />
      )}

      {etapa === "afirmativas" && (
        <JulgarAfirmativas
          afirmativas={afirmativas}
          valores={valores}
          aoContinuar={aposAfirmativas}
        />
      )}

      {etapa === "lancamento" && (
        <EtapaDoLancamento
          key={feitas}
          missao={missao}
          operacao={operacao}
          lancamentos={lancamentos}
          aoContinuar={aposLancamento}
        />
      )}

      {etapa === "conclusao" && (
        <>
          <div className="resultado certo">
            <strong>Missão cumprida!</strong>
            <span>Os lançamentos já estão no razão da empresa.</span>
          </div>
          {/* Fechamento do mês: a DRE fecha a missão. */}
          {missao.operacoes.some((o) => o.tipo === "apuracao_icms") && (
            <div className="painel-secao">
              <PainelDaDre />
            </div>
          )}
          <div className="recompensa">
            <IconeEstrela />
            <span>
              Recompensa: <strong>+{missao.recompensa.pontos} pts</strong>
            </span>
          </div>
          <button
            type="button"
            className="botao-principal"
            onClick={() => jogoStore.getState().concluirMissao(missao)}
          >
            <IconeCerto />
            Concluir Missão
          </button>
        </>
      )}
    </article>
  );
}

/** Passo "Efeito no Patrimônio": o jogador diz se cada conta aumenta ou diminui. */
function EtapaDoEfeito({
  lancamentos,
  aoContinuar,
}: {
  readonly lancamentos: readonly Lancamento[];
  readonly aoContinuar: () => void;
}) {
  const plano = useJogo((jogo) => jogo.contabil.planoDeContas);
  const efeito = useMemo(() => efeitoDosLancamentos(plano, lancamentos), [plano, lancamentos]);
  const [respostas, setRespostas] = useState<Readonly<Record<string, Direcao>>>({});
  const [conferido, setConferido] = useState(false);
  const completo = efeito.every((e) => respostas[e.conta]);
  const acertos = efeito.filter((e) => respostas[e.conta] === e.direcao).length;

  return (
    <section className="etapa">
      <h4>Efeito no Patrimônio</h4>
      <p className="etapa-instrucao">Marque o que acontece com o saldo de cada conta.</p>
      <ul className="efeitos">
        {efeito.map((e) => {
          const resposta = respostas[e.conta];
          const estado = conferido ? (resposta === e.direcao ? "certo" : "errado") : "";
          return (
            <li key={e.conta} className={estado}>
              <span className="efeito-conta">
                {e.nome} <em>({rotuloDoGrupo(e.grupo)})</em>
                {conferido && (
                  <small>
                    {e.direcao === "aumenta" ? "Aumenta" : "Diminui"}{" "}
                    {formatarReais(e.valorCentavos)}
                  </small>
                )}
              </span>
              <span className="efeito-botoes">
                {(["aumenta", "diminui"] as const).map((direcao) => (
                  <button
                    key={direcao}
                    type="button"
                    className={`seta ${direcao}`}
                    aria-pressed={resposta === direcao}
                    disabled={conferido}
                    onClick={() => setRespostas((atuais) => ({ ...atuais, [e.conta]: direcao }))}
                  >
                    {direcao === "aumenta" ? "▲ Aumenta" : "▼ Diminui"}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {conferido ? (
        <>
          <div className={`resultado ${acertos === efeito.length ? "certo" : "errado"}`}>
            <strong>
              {acertos === efeito.length
                ? "Isso mesmo!"
                : `Você acertou ${acertos} de ${efeito.length}.`}
            </strong>
            <span>Os valores acima mostram o efeito de cada conta.</span>
          </div>
          <button type="button" className="botao-principal" onClick={aoContinuar}>
            Continuar
          </button>
        </>
      ) : (
        <button
          type="button"
          className="botao-principal"
          disabled={!completo}
          onClick={() => setConferido(true)}
        >
          Conferir
        </button>
      )}
    </section>
  );
}

/** Passo "Faça o Lançamento": o jogador monta, o motor confere, e o erro vira prévia. */
function EtapaDoLancamento({
  missao,
  operacao,
  lancamentos,
  aoContinuar,
}: {
  readonly missao: Missao;
  readonly operacao: Operacao | null;
  readonly lancamentos: readonly Lancamento[];
  readonly aoContinuar: () => void;
}) {
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const esperadas = useMemo(() => linhasEsperadas(lancamentos), [lancamentos]);
  const semLancamento = esperadas.length === 0;
  // Fato sem lançamento: antes de tudo, o jogador decide se há o que lançar.
  const [decidiuLancar, setDecidiuLancar] = useState(false);
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [verResposta, setVerResposta] = useState(false);

  const conferir = (informado: readonly Partida[]) =>
    setConferencia(conferirLancamento(contabil, operacao, informado, data));

  if (conferencia?.comparacao.correto || verResposta) {
    return (
      <section className="etapa">
        <h4>Faça o Lançamento</h4>
        <div className={`resultado ${verResposta ? "neutro" : "certo"}`}>
          <strong>{verResposta ? "O lançamento correto é este:" : "Lançamento correto!"}</strong>
          {semLancamento && <span>Esse fato não gera lançamento contábil.</span>}
        </div>
        {!semLancamento && <TabelaDeLancamento partidas={esperadas} />}
        {[...new Set(lancamentos.flatMap((l) => l.regras))].slice(0, 3).map((regra) => (
          <RegraCitada key={regra} regra={regra} />
        ))}
        {semLancamento && missao.conceitos.includes("capital-autorizado") && (
          <RegraCitada regra="R-CAP-02" />
        )}
        <button type="button" className="botao-principal" onClick={aoContinuar}>
          Continuar
        </button>
      </section>
    );
  }

  if (semLancamento && !decidiuLancar) {
    return (
      <section className="etapa">
        <h4>Faça o Lançamento</h4>
        <p className="etapa-instrucao">Esse fato gera lançamento contábil?</p>
        <div className="julgar">
          <button type="button" className="neutro" onClick={() => conferir([])}>
            Não gera lançamento
          </button>
          <button type="button" className="neutro" onClick={() => setDecidiuLancar(true)}>
            Sim, vou lançar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="etapa">
      <h4>Faça o Lançamento</h4>
      <EditorDeLancamento
        ajuda={semLancamento ? "livre" : ajudaDaMissao(missao)}
        esperadas={esperadas}
        conferencia={conferencia}
        aoConferir={conferir}
        aoCorrigir={() => {
          setConferencia(null);
          if (semLancamento) setDecidiuLancar(false);
        }}
        aoVerResposta={() => setVerResposta(true)}
      />
    </section>
  );
}

/** Lançamento em formato de diário: débitos e créditos com conta e valor. */
export function TabelaDeLancamento({ partidas }: { readonly partidas: readonly Partida[] }) {
  const plano = useJogo((jogo) => jogo.contabil.planoDeContas);
  const nome = (conta: string) => plano.contas.find((c) => c.codigo === conta)?.nome ?? conta;
  return (
    <table className="lancamento">
      <tbody>
        {partidas.map((p) => (
          <tr key={`${p.conta}${p.lado}`} className={p.lado === "D" ? "debito" : "credito"}>
            <td>{p.lado}</td>
            <td>{nome(p.conta)}</td>
            <td>{formatarReais(p.valorCentavos)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
