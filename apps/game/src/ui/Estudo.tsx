import type { Afirmativa } from "@cidade/content";
import { useState } from "react";
import { selecionarParaRevisao } from "../orquestrador/afirmativas";
import { falar, VELOCIDADES } from "../som/narracao";
import { CAIXA_MAXIMA, conceitoVencido, diasAteARevisao } from "../state/estudo";
import { nivelDoJogador } from "../state/jogo";
import { conteudo, jogoStore, useJogo } from "../state/store";
import { JulgarAfirmativas } from "./Afirmativas";

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Bateria de afirmativas que a Revisão montaria agora, pelo estado atual da store. */
function montarBateria(): Afirmativa[] {
  const estado = jogoStore.getState();
  return selecionarParaRevisao(
    conteudo.afirmativas,
    estado,
    nivelDoJogador(estado, conteudo.missoes),
  );
}

/** Revisão no Escritório: baterias sob demanda dos conceitos vencidos no espaçamento. */
export function PainelDeRevisao() {
  const estudo = useJogo((jogo) => jogo.estudo);
  const hoje = useJogo((jogo) => jogo.data);
  const [bateria, setBateria] = useState<readonly Afirmativa[] | null>(null);
  const vistos = Object.keys(estudo).length;
  const vencidos = Object.values(estudo).filter((e) => conceitoVencido(e, hoje)).length;

  if (bateria) {
    return (
      <div className="cartao">
        <p className="painel-sobretitulo">Revisão</p>
        <JulgarAfirmativas afirmativas={bateria} aoContinuar={() => setBateria(null)} />
      </div>
    );
  }
  return (
    <div className="cartao">
      <h3>Revisão</h3>
      {vistos === 0 ? (
        <p className="painel-texto">
          Ainda não há o que revisar. Os conceitos aparecem aqui depois que você os encontra nas
          missões.
        </p>
      ) : vencidos === 0 ? (
        <p className="painel-texto">
          Tudo em dia! Nenhum conceito para revisar hoje. Eles voltam conforme o espaçamento.
        </p>
      ) : (
        <>
          <p className="painel-texto">
            <strong>{plural(vencidos, "conceito", "conceitos")}</strong> para revisar hoje.
          </p>
          <button
            type="button"
            className="botao-principal"
            onClick={() => setBateria(montarBateria())}
          >
            Começar a revisão
          </button>
        </>
      )}
    </div>
  );
}

/** Progresso: a força de cada conceito (caixas), funcionando como caderno de erros. */
export function PainelDeProgresso() {
  const pontos = useJogo((jogo) => jogo.pontos);
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas.length);
  const estudo = useJogo((jogo) => jogo.estudo);
  const hoje = useJogo((jogo) => jogo.data);
  const modoBanca = useJogo((jogo) => jogo.modoBanca);
  const placarBanca = useJogo((jogo) => jogo.placarBanca);
  const sinal = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
  // Conceito aberto, com a definição à mostra. Um por vez.
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <>
      <div className="cartao painel-progresso">
        <p className="painel-texto">
          <strong>{pontos}</strong> pontos ·{" "}
          <strong>
            {concluidas} de {conteudo.missoes.length}
          </strong>{" "}
          missões
        </p>
        {(modoBanca || placarBanca !== 0) && (
          <p className="painel-texto">
            Placar do modo banca: <strong>{sinal(placarBanca)}</strong>
          </p>
        )}
      </div>

      <div className="painel-secao cartao">
        <h3>Conceitos</h3>
        <ul className="conceitos">
          {conteudo.conceitos.map((conceito) => {
            const e = estudo[conceito.id];
            const situacao = !e
              ? "ainda não visto"
              : conceitoVencido(e, hoje)
                ? "revisar agora"
                : `revisa em ${plural(diasAteARevisao(e, hoje), "dia", "dias")}`;
            return (
              <li key={conceito.id} className={e ? (e.caixa === 1 ? "fraco" : "") : "novo"}>
                <button
                  type="button"
                  className="conceito-linha"
                  aria-expanded={aberto === conceito.id}
                  onClick={() => setAberto(aberto === conceito.id ? null : conceito.id)}
                >
                  <span className="conceito-texto">
                    <strong>{conceito.nome}</strong>
                    <span>
                      {e
                        ? `${plural(e.acertos, "acerto", "acertos")} · ${plural(e.erros, "erro", "erros")}${e.brancos > 0 ? ` · ${plural(e.brancos, "em branco", "em branco")}` : ""} · ${situacao}`
                        : situacao}
                      {e && (modoBanca || e.saldoBanca !== 0)
                        ? ` · banca ${sinal(e.saldoBanca)}`
                        : ""}
                    </span>
                  </span>
                  <span
                    className="caixas"
                    role="img"
                    aria-label={e ? `Caixa ${e.caixa} de ${CAIXA_MAXIMA}` : "Sem caixa"}
                  >
                    {Array.from({ length: CAIXA_MAXIMA }, (_, i) => (
                      <i key={i} className={e && i < e.caixa ? "cheia" : ""} />
                    ))}
                  </span>
                </button>
                {aberto === conceito.id && (
                  <p className="conceito-definicao">{conceito.definicao}</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="painel-nota">
          Toque num conceito para ver a definição. Cada acerto sobe o conceito uma caixa e espaça a
          próxima cobrança (1, 3, 7 e 15 dias). Um erro o devolve para a primeira caixa.
        </p>
      </div>
    </>
  );
}

/** Configurações: o som e o modo banca. */
export function PainelDeConfiguracoes() {
  const modoBanca = useJogo((jogo) => jogo.modoBanca);
  const somLigado = useJogo((jogo) => jogo.somLigado);
  const velocidade = useJogo((jogo) => jogo.velocidadeDaVoz);
  const automatica = useJogo((jogo) => jogo.narracaoAutomatica);
  return (
    <>
      <div className="cartao">
        <h3>Som</h3>
        <button
          type="button"
          className="interruptor"
          role="switch"
          aria-checked={somLigado}
          onClick={() => jogoStore.getState().definirSom(!somLigado)}
        >
          <span className="interruptor-trilho">
            <span />
          </span>
          Efeitos sonoros {somLigado ? "ligados" : "desligados"}
        </button>
      </div>
      <div className="painel-secao cartao">
        <h3>Narração</h3>
        <p className="painel-texto">
          Toque no alto-falante ao lado de um texto para ouvi-lo. Toque de novo para parar.
        </p>
        <button
          type="button"
          className="interruptor"
          role="switch"
          aria-checked={automatica}
          onClick={() => jogoStore.getState().definirNarracaoAutomatica(!automatica)}
        >
          <span className="interruptor-trilho">
            <span />
          </span>
          Narração automática {automatica ? "ligada" : "desligada"}
        </button>
        <p className="painel-nota">
          Ligada, cada fala e cada explicação é lida assim que aparece na tela.
        </p>
        <div className="velocidades" role="radiogroup" aria-label="Ritmo da leitura">
          {VELOCIDADES.map(([id, nome]) => (
            // biome-ignore lint/a11y/useSemanticElements: botões em grupo, com o visual do jogo.
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={velocidade === id}
              onClick={() => {
                jogoStore.getState().definirVelocidadeDaVoz(id);
                falar("Assim está bom? Vamos fechar as contas do mês!");
              }}
            >
              {nome}
            </button>
          ))}
        </div>
        <p className="painel-nota">
          A voz é a do seu aparelho; o jogo escolhe a mais natural que encontrar em português.
        </p>
      </div>
      <div className="painel-secao cartao">
        <h3>Modo banca</h3>
        <p className="painel-texto">
          No estilo CEBRASPE: cada acerto vale <strong>+1</strong>, cada erro vale{" "}
          <strong>−1</strong> e a resposta em branco vale <strong>0</strong>. Aparece a opção
          “Deixar em branco”.
        </p>
        <button
          type="button"
          className="interruptor"
          role="switch"
          aria-checked={modoBanca}
          onClick={() => jogoStore.getState().definirModoBanca(!modoBanca)}
        >
          <span className="interruptor-trilho">
            <span />
          </span>
          Modo banca {modoBanca ? "ligado" : "desligado"}
        </button>
        <p className="painel-nota">
          O modo banca não muda a repetição espaçada: em branco conta como “não sei” e o conceito
          volta para a primeira caixa.
        </p>
      </div>
    </>
  );
}
