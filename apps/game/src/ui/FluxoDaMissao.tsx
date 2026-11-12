import { type Missao, type Proposta, paraOperacaoDoMotor } from "@cidade/content";
import {
  ErroDeOperacao,
  type Lancamento,
  type Operacao,
  type Partida,
  preverLancamentos,
} from "@cidade/ledger";
import { useMemo, useState } from "react";
import { selecionarAfirmativas } from "../orquestrador/afirmativas";
import { type Direcao, efeitoDosLancamentos } from "../orquestrador/efeito";
import {
  ajudaDaMissao,
  type Conferencia,
  conferirLancamento,
  linhasEsperadas,
} from "../orquestrador/lancamento";
import { tocar } from "../som/sons";
import { acoesRestantes, operacoesExecutadas, type Resposta } from "../state/jogo";
import { conteudo, jogoStore, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { AfirmativasJulgadas, JulgarAfirmativas } from "./Afirmativas";
import { Conversa } from "./Conversa";
import { PainelDaDre } from "./Demonstracoes";
import { Dica } from "./Dica";
import { EditorDeLancamento } from "./EditorDeLancamento";
import { IconeCerto, IconeEstrela, Retrato } from "./icones";
import { RegraCitada } from "./RegraCitada";
import { EstudoDoTema } from "./Tema";

type Etapa = "aula" | "negociacao" | "efeito" | "afirmativas" | "lancamento" | "conclusao";

function Passos({ etapa, temEfeito }: { readonly etapa: Etapa; readonly temEfeito: boolean }) {
  const passos: readonly (readonly [Etapa, string])[] = [
    ...(temEfeito ? ([["efeito", "Efeito"]] as const) : []),
    ["afirmativas", "Afirmativas"],
    ["lancamento", "Lançamento"],
  ];
  if (etapa === "aula" || etapa === "negociacao" || etapa === "conclusao") return null;
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
 * Até a operação ser gravada, o jogador pode voltar às etapas anteriores para rever.
 */
export function FluxoDaMissao({
  missao,
  aoConcluir,
}: {
  readonly missao: Missao;
  /** Chamado depois de concluir a missão (ex.: para fechar o painel e voltar ao mapa). */
  readonly aoConcluir?: () => void;
}) {
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
  // Aulas desta missão que o jogador ainda não viu: a explicação vem antes da conversa.
  const [aulas, setAulas] = useState(() =>
    (missao.aulas ?? [])
      .filter((id) => jogoStore.getState().teoria[id] === undefined)
      .flatMap((id) => conteudo.teoria.filter((tema) => tema.id === id)),
  );
  // Missão sem operação: uma conversa com a contadora. Primeiro as falas, depois as
  // explicações, e nenhum lançamento.
  const conversa = missao.operacoes.length === 0;
  const [totalDeAulas] = useState(aulas.length);
  const [etapa, setEtapa] = useState<Etapa>(() => {
    if (conversa) return "negociacao";
    if (feitas === 0) return aulas.length > 0 ? "aula" : "negociacao";
    return feitas < missao.operacoes.length ? "efeito" : "conclusao";
  });
  // Etapas por onde o jogador passou nesta operação, para o botão "Voltar".
  const [anteriores, setAnteriores] = useState<readonly Etapa[]>([]);
  const [respostas, setRespostas] = useState<Readonly<Record<string, Resposta>>>({});
  const [jaNegociou, setJaNegociou] = useState(false);
  const irPara = (proxima: Etapa) => {
    setAnteriores((atuais) => [...atuais, etapa]);
    setEtapa(proxima);
  };
  const voltar = () => {
    const anterior = anteriores.at(-1);
    if (!anterior) return;
    setAnteriores(anteriores.slice(0, -1));
    setEtapa(anterior);
  };

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
    setJaNegociou(true);
    if (conversa) {
      setEtapa(aulas.length > 0 ? "aula" : "conclusao");
      return;
    }
    // Fato sem lançamento: primeiro a decisão, depois as afirmativas (que dariam a resposta).
    irPara(temEfeito ? "efeito" : "lancamento");
  };
  // Afirmativas já julgadas voltam só para rever, quando há alguma.
  const aposEfeito = () => irPara(afirmativas.length === 0 ? "lancamento" : "afirmativas");
  const aposAfirmativas = () => {
    setAfirmativasFeitas(true);
    irPara(temEfeito ? "lancamento" : "conclusao");
  };
  const aposLancamento = () => {
    if (operacao) jogoStore.getState().executarProximaOperacao(missao);
    const proximas = feitas + (operacao ? 1 : 0) < missao.operacoes.length;
    // A operação foi gravada no razão: daqui não se volta.
    setAnteriores([]);
    setEtapa(etapaDaOperacao(proximas));
  };
  const podeVoltar = anteriores.length > 0 && etapa !== "conclusao";

  return (
    <article className="painel-missao">
      <h3 className="missao-cabecalho">
        <span>
          Capítulo {missao.capitulo}
          {missao.operacoes.length > 1 && etapa !== "negociacao" && etapa !== "conclusao"
            ? ` · Operação ${Math.min(feitas + 1, missao.operacoes.length)} de ${missao.operacoes.length}`
            : ""}
        </span>{" "}
        · {missao.titulo}
      </h3>
      <Passos etapa={etapa} temEfeito={temEfeito} />
      {podeVoltar && (
        <button type="button" className="etapa-voltar" onClick={voltar}>
          ‹ Voltar
        </button>
      )}

      {etapa === "aula" && aulas[0] && (
        <>
          <p className="aula-chamada">
            <Retrato personagem="marta-contadora" nome="Marta" />
            {conversa ? (
              <span>
                <strong>A Marta explica</strong> · parte {totalDeAulas - aulas.length + 1} de{" "}
                {totalDeAulas}
              </span>
            ) : (
              <span>
                <strong>Antes de começar</strong>, uma explicação rápida da Marta
                {aulas.length > 1 ? ` (faltam ${aulas.length}).` : "."}
              </span>
            )}
          </p>
          <EstudoDoTema
            key={aulas[0].id}
            tema={aulas[0]}
            rotuloDoFim={
              aulas.length > 1
                ? "Próxima explicação ›"
                : conversa
                  ? "Encerrar a conversa ›"
                  : "Ir para a missão ›"
            }
            aoConcluir={() => {
              const restantes = aulas.slice(1);
              setAulas(restantes);
              if (restantes.length === 0) setEtapa(conversa ? "conclusao" : "negociacao");
            }}
          />
          <button
            type="button"
            className="botao-secundario"
            onClick={() => setEtapa(conversa ? "conclusao" : "negociacao")}
          >
            {conversa ? "Já sei disso: pular as explicações" : "Pular a explicação"}
          </button>
        </>
      )}

      {etapa === "negociacao" && (
        <Conversa
          // Ao voltar, a conversa reabre na última fala, com o cartão da proposta.
          inicio={jaNegociou ? missao.dialogo.length - 1 : 0}
          falas={missao.dialogo}
          npc={{ id: missao.npc, nome: npc?.nome ?? "", papel: npc?.papel ?? "" }}
          acaoFinal={
            <>
              <IconeCerto />
              {conversa ? "Vamos lá!" : temEfeito ? "Aceitar a proposta" : "Responder"}
            </>
          }
          aoConcluir={aposNegociacao}
          {...(missao.proposta ? { anexo: <CartaoDaProposta proposta={missao.proposta} /> } : {})}
        />
      )}

      {etapa === "efeito" && (
        <EtapaDoEfeito
          // Recomeça do zero a cada operação.
          key={feitas}
          lancamentos={lancamentos}
          aoContinuar={aposEfeito}
        />
      )}

      {etapa === "afirmativas" &&
        (afirmativasFeitas ? (
          <AfirmativasJulgadas
            afirmativas={afirmativas}
            respostas={respostas}
            valores={valores}
            aoContinuar={aposAfirmativas}
          />
        ) : (
          <JulgarAfirmativas
            afirmativas={afirmativas}
            valores={valores}
            aoContinuar={aposAfirmativas}
            aoResponder={(afirmativa, resposta) =>
              setRespostas((atuais) => ({ ...atuais, [afirmativa.id]: resposta }))
            }
          />
        ))}

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
            <strong>{conversa ? "Conversa concluída!" : "Missão cumprida!"}</strong>
            <span>
              {conversa
                ? "Para rever essas explicações, volte ao Escritório e abra a Teoria."
                : "Os lançamentos já estão no razão da empresa."}
            </span>
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
            onClick={() => {
              jogoStore.getState().concluirMissao(missao);
              tocar("missao");
              aoConcluir?.();
            }}
          >
            <IconeCerto />
            {conversa ? "Voltar ao mapa" : "Concluir Missão"}
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
      <Dica id="efeito">
        Antes de lançar, pense no efeito da operação: o saldo de cada conta aumenta ou diminui?
      </Dica>
      <p className="etapa-instrucao">Marque o que acontece com o saldo de cada conta.</p>
      <ul className="efeitos">
        {efeito.map((e) => {
          const resposta = respostas[e.conta];
          const estado = conferido ? (resposta === e.direcao ? "certo" : "errado") : "";
          return (
            <li key={e.conta} className={estado}>
              <span className="efeito-conta">
                {e.nome} <em>{e.classificacao}</em>
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
          onClick={() => {
            setConferido(true);
            tocar(acertos === efeito.length ? "acerto" : "erro");
          }}
        >
          Conferir
        </button>
      )}
    </section>
  );
}

/** Passo "Faça o Lançamento": o jogador monta, o motor confere, e o erro vira prévia. */
/** Cartão com os dados da operação: a "nota" que o jogador consulta para lançar. */
function CartaoDaProposta({ proposta }: { readonly proposta: Proposta }) {
  return (
    <aside className="proposta" aria-label={proposta.titulo}>
      <strong>{proposta.titulo}</strong>
      <ul>
        {proposta.linhas.map((linha) => (
          <li key={linha}>{linha}</li>
        ))}
      </ul>
    </aside>
  );
}

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

  const conferir = (informado: readonly Partida[]) => {
    const resultado = conferirLancamento(contabil, operacao, informado, data);
    tocar(resultado.comparacao.correto ? "acerto" : "erro");
    setConferencia(resultado);
  };

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
        {semLancamento && operacao?.tipo === "recebimento_consignacao" && (
          <RegraCitada regra="R-CSG-01" />
        )}
        {semLancamento && operacao?.tipo === "devolucao_consignacao" && (
          <RegraCitada regra="R-CSG-03" />
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
        {missao.proposta && <CartaoDaProposta proposta={missao.proposta} />}
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
      <Dica id="lancamento">
        Agora registre a operação. O total dos débitos tem de ser igual ao dos créditos, e os
        valores estão no cartão abaixo.
      </Dica>
      {missao.proposta && <CartaoDaProposta proposta={missao.proposta} />}
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
