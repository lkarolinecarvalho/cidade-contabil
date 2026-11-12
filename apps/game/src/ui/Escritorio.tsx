import type { Tema } from "@cidade/content";
import { type ReactNode, useMemo, useState } from "react";
import { contasComMovimento, diario, planoPorGrupo, razaoDaConta } from "../orquestrador/consulta";
import {
  linhasDaDreEmbaralhadas,
  ORDEM_DA_DRE,
  type RodadaDeEscolha,
  rodadasDeClassificacao,
  rodadasDeNatureza,
} from "../orquestrador/desafios";
import { conceitoVencido } from "../state/estudo";
import { PONTOS_POR_AFIRMATIVA } from "../state/jogo";
import { conteudo, jogoStore, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { PainelDaDre, PainelDoBalanco } from "./Demonstracoes";
import { PainelDeRevisao } from "./Estudo";

type Porta = "consulta" | "teoria" | "revisao" | "desafios";

const PORTAS: readonly {
  readonly id: Porta;
  readonly titulo: string;
  readonly descricao: string;
}[] = [
  {
    id: "consulta",
    titulo: "Consulta",
    descricao: "Plano de Contas, Balanço, DRE, Diário e Razão",
  },
  { id: "teoria", titulo: "Teoria", descricao: "Conceitos em cartões curtos, com perguntas" },
  { id: "revisao", titulo: "Revisão", descricao: "Certo ou Errado do que você já viu" },
  { id: "desafios", titulo: "Desafios", descricao: "Exercícios rápidos, sem lançamento" },
];

/** Cabeçalho de uma tela interna: o botão de voltar e o título. */
function Voltar({ para, aoVoltar }: { readonly para: string; readonly aoVoltar: () => void }) {
  return (
    <button type="button" className="escritorio-voltar" onClick={aoVoltar}>
      ‹ {para}
    </button>
  );
}

/**
 * Escritório Contábil: a central de conhecimento. Quatro portas, cada uma com telas
 * curtas: consultar a própria empresa, estudar a teoria, revisar e treinar.
 */
export function PainelDoEscritorio() {
  const [porta, setPorta] = useState<Porta | null>(null);
  const estudo = useJogo((jogo) => jogo.estudo);
  const hoje = useJogo((jogo) => jogo.data);
  const vencidos = Object.values(estudo).filter((e) => conceitoVencido(e, hoje)).length;
  const temasVistos = useJogo((jogo) => Object.keys(jogo.teoria).length);
  const voltar = () => setPorta(null);

  if (porta === "consulta") return <Consulta aoVoltar={voltar} />;
  if (porta === "teoria") return <Teoria aoVoltar={voltar} />;
  if (porta === "desafios") return <Desafios aoVoltar={voltar} />;
  if (porta === "revisao") {
    return (
      <>
        <Voltar para="Escritório" aoVoltar={voltar} />
        <PainelDeRevisao />
      </>
    );
  }

  const selo: Readonly<Record<Porta, string>> = {
    consulta: "",
    teoria: `${temasVistos} de ${conteudo.teoria.length}`,
    revisao: vencidos > 0 ? `${vencidos} para revisar` : "",
    desafios: "",
  };
  return (
    <>
      <p className="painel-texto escritorio-chamada">
        Aqui você consulta a sua empresa, estuda a teoria e treina para a prova.
      </p>
      <div className="portas">
        {PORTAS.map(({ id, titulo, descricao }) => (
          <button
            key={id}
            type="button"
            className={`porta porta-${id}`}
            onClick={() => setPorta(id)}
          >
            <strong>{titulo}</strong>
            <span>{descricao}</span>
            {selo[id] && <em>{selo[id]}</em>}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

type Aba = "plano" | "balanco" | "dre" | "diario" | "razao";

const ABAS: readonly (readonly [Aba, string])[] = [
  ["plano", "Plano"],
  ["balanco", "Balanço"],
  ["dre", "DRE"],
  ["diario", "Diário"],
  ["razao", "Razão"],
];

const DIARIO_POR_PAGINA = 8;

function Consulta({ aoVoltar }: { readonly aoVoltar: () => void }) {
  const [aba, setAba] = useState<Aba>("plano");
  return (
    <>
      <Voltar para="Escritório" aoVoltar={aoVoltar} />
      <div className="abas" role="tablist" aria-label="Consulta">
        {ABAS.map(([id, nome]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
          >
            {nome}
          </button>
        ))}
      </div>
      {aba === "plano" && <PlanoDeContas />}
      {aba === "balanco" && <PainelDoBalanco />}
      {aba === "dre" && <PainelDaDre />}
      {aba === "diario" && <Diario />}
      {aba === "razao" && <Razao />}
    </>
  );
}

function PlanoDeContas() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const grupos = useMemo(() => planoPorGrupo(contabil), [contabil]);
  return (
    <div className="cartao">
      <h3>Plano de Contas</h3>
      <p className="painel-nota">
        D: natureza devedora (aumenta a débito). C: natureza credora (aumenta a crédito).
      </p>
      {grupos.map((grupo) => (
        <section key={grupo.grupo} className="plano-grupo">
          <h4>{grupo.classificacao}</h4>
          <ul>
            {grupo.contas.map((conta) => (
              <li key={conta.codigo}>
                <span className="plano-codigo">{conta.codigo}</span>
                <span className="plano-nome">
                  {conta.nome}
                  {conta.redutora && <em> redutora</em>}
                </span>
                <span className="plano-natureza" title={`Natureza ${conta.natureza}`}>
                  {conta.natureza === "devedora" ? "D" : "C"}
                </span>
                <span className="plano-saldo">
                  {conta.saldoCentavos === 0 ? "—" : formatarReais(conta.saldoCentavos)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Diario() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const registros = useMemo(() => diario(contabil), [contabil]);
  const [quantos, setQuantos] = useState(DIARIO_POR_PAGINA);
  if (registros.length === 0) {
    return (
      <div className="cartao">
        <h3>Diário</h3>
        <p className="painel-texto">
          Ainda não há lançamentos. Eles aparecem aqui a cada operação.
        </p>
      </div>
    );
  }
  return (
    <div className="cartao">
      <h3>Diário</h3>
      <p className="painel-nota">Do lançamento mais recente para o mais antigo.</p>
      <ol className="diario">
        {registros.slice(0, quantos).map((registro) => (
          <li key={registro.id}>
            <p className="diario-cabecalho">
              <strong>
                Dia {registro.data.dia}/{registro.data.mes}
              </strong>{" "}
              · {registro.historico}
            </p>
            {registro.partidas.map((partida, indice) => (
              <p
                // As partidas de um lançamento não mudam de ordem.
                key={indice}
                className={partida.lado === "D" ? "diario-debito" : "diario-credito"}
              >
                <span>
                  {partida.lado} {partida.conta}
                </span>
                <span>{formatarReais(partida.valorCentavos)}</span>
              </p>
            ))}
          </li>
        ))}
      </ol>
      {quantos < registros.length && (
        <button
          type="button"
          className="botao-secundario"
          onClick={() => setQuantos(quantos + DIARIO_POR_PAGINA)}
        >
          Mostrar mais ({registros.length - quantos})
        </button>
      )}
    </div>
  );
}

function Razao() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const contas = useMemo(() => contasComMovimento(contabil), [contabil]);
  const [codigo, setCodigo] = useState<string | null>(null);
  const escolhida = codigo ?? contas[0]?.codigo ?? null;
  const razao = escolhida ? razaoDaConta(contabil, escolhida) : null;
  if (!razao) {
    return (
      <div className="cartao">
        <h3>Razão</h3>
        <p className="painel-texto">Ainda não há contas com movimento.</p>
      </div>
    );
  }
  return (
    <div className="cartao">
      <h3>Razão</h3>
      <label className="razao-escolha">
        Conta
        <select value={razao.codigo} onChange={(e) => setCodigo(e.target.value)}>
          {contas.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      {/* O razonete em T: débitos à esquerda, créditos à direita. */}
      <div className="razonete">
        <p className="razonete-titulo">{razao.nome}</p>
        <div className="razonete-colunas">
          {(["D", "C"] as const).map((lado) => (
            <div key={lado}>
              <p className="razonete-lado">{lado === "D" ? "Débito" : "Crédito"}</p>
              {razao.movimentos
                .filter((m) => m.lado === lado)
                .map((m) => (
                  <p key={`${m.id}-${m.valorCentavos}`} title={m.historico}>
                    <small>
                      {m.data.dia}/{m.data.mes}
                    </small>
                    {formatarReais(m.valorCentavos)}
                  </p>
                ))}
              <p className="razonete-total">
                {formatarReais(
                  lado === "D" ? razao.totalDebitosCentavos : razao.totalCreditosCentavos,
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="painel-texto">
        Saldo:{" "}
        <strong>
          {razao.ladoDoSaldo === null
            ? "zerado"
            : `${formatarReais(razao.saldoCentavos)} ${razao.ladoDoSaldo === "D" ? "devedor" : "credor"}`}
        </strong>
        . A conta tem natureza {razao.natureza}.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teoria
// ---------------------------------------------------------------------------

function Teoria({ aoVoltar }: { readonly aoVoltar: () => void }) {
  const estudados = useJogo((jogo) => jogo.teoria);
  const [tema, setTema] = useState<Tema | null>(null);
  if (tema) return <CartaoDoTema key={tema.id} tema={tema} aoVoltar={() => setTema(null)} />;
  return (
    <>
      <Voltar para="Escritório" aoVoltar={aoVoltar} />
      <ul className="temas">
        {conteudo.teoria.map((t) => {
          const acertos = estudados[t.id];
          return (
            <li key={t.id}>
              <button type="button" onClick={() => setTema(t)}>
                <span className="tema-texto">
                  <strong>{t.titulo}</strong>
                  <span>{t.resumo}</span>
                </span>
                <em className={acertos === undefined ? "" : "visto"}>
                  {acertos === undefined ? "novo" : `${acertos} de ${t.perguntas.length}`}
                </em>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Um tema, um passo por vez: os pontos, o exemplo e as perguntas. */
function CartaoDoTema({ tema, aoVoltar }: { readonly tema: Tema; readonly aoVoltar: () => void }) {
  // Passos: cada ponto, depois o exemplo, depois cada pergunta, e o fecho.
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<readonly ("C" | "E")[]>([]);
  const noExemplo = passo === tema.pontos.length;
  const indiceDaPergunta = passo - tema.pontos.length - 1;
  const pergunta = tema.perguntas[indiceDaPergunta];
  const resposta = respostas[indiceDaPergunta];
  const total = tema.pontos.length + 1 + tema.perguntas.length;
  const acertos = respostas.filter((r, i) => r === tema.perguntas[i]?.gabarito).length;
  const fim = passo >= total;

  const avancar = () => {
    if (passo + 1 >= total) jogoStore.getState().registrarTema(tema.id, acertos);
    setPasso(passo + 1);
  };

  let corpo: ReactNode;
  if (fim) {
    corpo = (
      <div className="resultado certo">
        <strong>Tema concluído!</strong>
        <span>
          Você acertou {acertos} de {tema.perguntas.length}. Cada acerto novo vale{" "}
          {PONTOS_POR_AFIRMATIVA} pontos.
        </span>
      </div>
    );
  } else if (pergunta) {
    corpo = (
      <>
        <p className="tema-rotulo">Certo ou errado?</p>
        <p className="afirmativa">{pergunta.enunciado}</p>
        {resposta === undefined ? (
          <div className="julgar">
            {(["C", "E"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={opcao === "C" ? "certo" : "errado"}
                onClick={() => setRespostas([...respostas, opcao])}
              >
                {opcao === "C" ? "✓ Certo" : "✗ Errado"}
              </button>
            ))}
          </div>
        ) : (
          <div className={`resultado ${resposta === pergunta.gabarito ? "certo" : "errado"}`}>
            <strong>
              {resposta === pergunta.gabarito ? "Acertou!" : "Não foi dessa vez."} A afirmativa está{" "}
              {pergunta.gabarito === "C" ? "certa" : "errada"}.
            </strong>
            <span>{pergunta.explicacao}</span>
          </div>
        )}
      </>
    );
  } else if (noExemplo) {
    corpo = (
      <>
        <p className="tema-rotulo">Na Chapa da Praça</p>
        <p className="tema-ponto tema-exemplo">{tema.exemplo}</p>
      </>
    );
  } else {
    corpo = (
      <>
        <p className="tema-rotulo">
          Ponto {passo + 1} de {tema.pontos.length}
        </p>
        <p className="tema-ponto">{tema.pontos[passo]}</p>
      </>
    );
  }

  const esperandoResposta = pergunta !== undefined && resposta === undefined;
  return (
    <>
      <Voltar para="Teoria" aoVoltar={aoVoltar} />
      <article className="cartao tema" key={passo}>
        <h3>{tema.titulo}</h3>
        {corpo}
      </article>
      <div className="tema-rodape">
        {passo > 0 && !fim ? (
          <button type="button" className="conversa-voltar" onClick={() => setPasso(passo - 1)}>
            ‹ Voltar
          </button>
        ) : (
          <span />
        )}
        <span
          className="conversa-pontos"
          role="img"
          aria-label={`Passo ${Math.min(passo + 1, total)} de ${total}`}
        >
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={i === passo ? "atual" : i < passo ? "lida" : ""} />
          ))}
        </span>
        <span />
      </div>
      {fim ? (
        <button type="button" className="botao-principal" onClick={aoVoltar}>
          Voltar aos temas
        </button>
      ) : (
        !esperandoResposta && (
          <button type="button" className="botao-principal" onClick={avancar}>
            {passo + 1 >= total ? "Concluir" : "Continuar ›"}
          </button>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Desafios
// ---------------------------------------------------------------------------

type Desafio = "classificacao" | "natureza" | "dre";

const DESAFIOS: readonly {
  readonly id: Desafio;
  readonly titulo: string;
  readonly descricao: string;
}[] = [
  {
    id: "classificacao",
    titulo: "Onde fica a conta?",
    descricao: "Escolha o grupo de cada conta.",
  },
  {
    id: "natureza",
    titulo: "Devedora ou credora?",
    descricao: "Diga para que lado a conta aumenta.",
  },
  { id: "dre", titulo: "Monte a DRE", descricao: "Toque nas linhas na ordem certa." },
];

function Desafios({ aoVoltar }: { readonly aoVoltar: () => void }) {
  const [desafio, setDesafio] = useState<Desafio | null>(null);
  // Cada nova partida usa outra semente, para as perguntas mudarem.
  const [partida, setPartida] = useState(1);
  const plano = useJogo((jogo) => jogo.contabil.planoDeContas);
  const sair = () => {
    setDesafio(null);
    setPartida(partida + 1);
  };

  if (desafio === "dre") return <MontarDre key={partida} semente={partida} aoVoltar={sair} />;
  if (desafio) {
    const rodadas =
      desafio === "classificacao"
        ? rodadasDeClassificacao(plano, partida)
        : rodadasDeNatureza(plano, partida);
    const titulo = DESAFIOS.find((d) => d.id === desafio)?.titulo ?? "";
    return <Escolhas key={partida} titulo={titulo} rodadas={rodadas} aoVoltar={sair} />;
  }
  return (
    <>
      <Voltar para="Escritório" aoVoltar={aoVoltar} />
      <ul className="temas">
        {DESAFIOS.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => setDesafio(d.id)}>
              <span className="tema-texto">
                <strong>{d.titulo}</strong>
                <span>{d.descricao}</span>
              </span>
              <em>jogar</em>
            </button>
          </li>
        ))}
      </ul>
      <p className="painel-nota">Os desafios são treino livre: não valem pontos.</p>
    </>
  );
}

/** Desafio de múltipla escolha: uma conta por rodada. */
function Escolhas({
  titulo,
  rodadas,
  aoVoltar,
}: {
  readonly titulo: string;
  readonly rodadas: readonly RodadaDeEscolha[];
  readonly aoVoltar: () => void;
}) {
  const [indice, setIndice] = useState(0);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [acertos, setAcertos] = useState(0);
  const rodada = rodadas[indice];

  if (!rodada) {
    return (
      <>
        <Voltar para="Desafios" aoVoltar={aoVoltar} />
        <div className="cartao">
          <h3>{titulo}</h3>
          <div className="resultado certo">
            <strong>
              Você acertou {acertos} de {rodadas.length}.
            </strong>
            <span>Jogue de novo: as contas mudam a cada partida.</span>
          </div>
        </div>
        <button type="button" className="botao-principal" onClick={aoVoltar}>
          Voltar aos desafios
        </button>
      </>
    );
  }
  const responder = (opcao: string) => {
    setEscolha(opcao);
    if (opcao === rodada.correta) setAcertos(acertos + 1);
  };
  return (
    <>
      <Voltar para="Desafios" aoVoltar={aoVoltar} />
      <div className="cartao">
        <h3>
          {titulo}{" "}
          <small>
            {indice + 1} de {rodadas.length}
          </small>
        </h3>
        <p className="desafio-conta">{rodada.conta}</p>
        <div className="desafio-opcoes">
          {rodada.opcoes.map((opcao) => (
            <button
              key={opcao}
              type="button"
              disabled={escolha !== null}
              className={
                escolha === null
                  ? ""
                  : opcao === rodada.correta
                    ? "certa"
                    : opcao === escolha
                      ? "errada"
                      : ""
              }
              onClick={() => responder(opcao)}
            >
              {opcao}
            </button>
          ))}
        </div>
      </div>
      {escolha !== null && (
        <button
          type="button"
          className="botao-principal"
          onClick={() => {
            setIndice(indice + 1);
            setEscolha(null);
          }}
        >
          {indice + 1 >= rodadas.length ? "Ver o resultado" : "Próxima ›"}
        </button>
      )}
    </>
  );
}

/** "Monte a DRE": tocar nas linhas na ordem em que aparecem na demonstração. */
function MontarDre({
  semente,
  aoVoltar,
}: {
  readonly semente: number;
  readonly aoVoltar: () => void;
}) {
  const [linhas] = useState(() => linhasDaDreEmbaralhadas(semente));
  const [montadas, setMontadas] = useState<readonly string[]>([]);
  const [erros, setErros] = useState(0);
  const [errada, setErrada] = useState<string | null>(null);
  const pronta = montadas.length === ORDEM_DA_DRE.length;

  const tocar = (linha: string) => {
    if (linha === ORDEM_DA_DRE[montadas.length]) {
      setMontadas([...montadas, linha]);
      setErrada(null);
    } else {
      setErros(erros + 1);
      setErrada(linha);
    }
  };
  return (
    <>
      <Voltar para="Desafios" aoVoltar={aoVoltar} />
      <div className="cartao">
        <h3>Monte a DRE</h3>
        <p className="painel-nota">Toque nas linhas de baixo na ordem em que aparecem na DRE.</p>
        <ol className="dre-montada">
          {montadas.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
          {!pronta && <li className="vazia">Qual é a próxima linha?</li>}
        </ol>
        <div className="desafio-opcoes">
          {linhas
            .filter((linha) => !montadas.includes(linha))
            .map((linha) => (
              <button
                key={linha}
                type="button"
                className={linha === errada ? "errada" : ""}
                onClick={() => tocar(linha)}
              >
                {linha}
              </button>
            ))}
        </div>
        {pronta && (
          <div className="resultado certo">
            <strong>DRE montada!</strong>
            <span>{erros === 0 ? "Sem nenhum erro." : `Com ${erros} toque(s) fora de ordem.`}</span>
          </div>
        )}
      </div>
      {pronta && (
        <button type="button" className="botao-principal" onClick={aoVoltar}>
          Voltar aos desafios
        </button>
      )}
    </>
  );
}
