import type { Missao } from "@cidade/content";
import { type ReactNode, useState } from "react";
import {
  ACOES_POR_DIA,
  DIAS_NO_MES,
  ehUltimoDiaDoMes,
  formatarData,
  situacaoDoTitulo,
  titulosEmAberto,
} from "../state/calendario";
import {
  acoesRestantes,
  mesFechado,
  missaoDeFechamento,
  missaoDisponivelHoje,
  proximaMissao,
} from "../state/jogo";
import { conteudo, jogoStore, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { PainelDoEscritorio } from "./Demonstracoes";
import { FluxoDaMissao } from "./FluxoDaMissao";

export { PainelDoEscritorio } from "./Demonstracoes";

const nomeDoEstabelecimento = (id: string): string =>
  conteudo.estabelecimentos.find((e) => e.id === id)?.nome ?? id;

function useProximaMissao(): Missao | undefined {
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  return proximaMissao({ missoesConcluidas: concluidas }, conteudo.missoes);
}

/** Roda uma ação da store e devolve a mensagem do erro, se ela for bloqueada. */
function useAcao(): readonly [string | null, (acao: () => void) => void] {
  const [erro, setErro] = useState<string | null>(null);
  const executar = (acao: () => void) => {
    try {
      acao();
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível fazer isso agora.");
    }
  };
  return [erro, executar];
}

function Aviso({ children }: { readonly children: ReactNode }) {
  return (
    <p className="painel-erro" role="alert">
      {children}
    </p>
  );
}

const SITUACAO = {
  a_vencer: "a vencer",
  vence_hoje: "vence hoje",
  vencido: "vencido",
} as const;

/** Títulos a pagar e a receber. Com `comAcoes`, permite pagar e receber (no Banco). */
function ListaDeTitulos({ comAcoes }: { readonly comAcoes: boolean }) {
  const titulos = useJogo((jogo) => jogo.titulos);
  const hoje = useJogo((jogo) => jogo.data);
  const [erro, executar] = useAcao();
  const abertos = titulosEmAberto(titulos);

  if (abertos.length === 0) {
    return <p className="painel-nota">Nenhum título a pagar ou a receber.</p>;
  }
  return (
    <>
      <ul className="titulos">
        {abertos.map((titulo) => {
          const situacao = situacaoDoTitulo(titulo, hoje);
          const podeLiquidar = titulo.tipo === "pagar" || situacao !== "a_vencer";
          return (
            <li key={titulo.id} className={situacao}>
              <span className="titulo-texto">
                <strong>
                  {titulo.tipo === "pagar" ? "A pagar" : "A receber"} · {titulo.descricao}
                </strong>
                <span>
                  {formatarReais(titulo.saldoCentavos)} · vence no {formatarData(titulo.vencimento)}{" "}
                  <em>({SITUACAO[situacao]})</em>
                </span>
              </span>
              {comAcoes && podeLiquidar && (
                <button
                  type="button"
                  className="botao-pequeno"
                  onClick={() => executar(() => jogoStore.getState().liquidarTitulo(titulo.id))}
                >
                  {titulo.tipo === "pagar" ? "Pagar" : "Receber"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {erro && <Aviso>{erro}</Aviso>}
    </>
  );
}

/** Situação do ICMS no Posto Fiscal, com o pagamento do saldo devedor apurado (R-ICMS-06). */
function PainelDoIcms() {
  const aPagar = useJogo((jogo) => jogo.icmsAPagarCentavos);
  const fechado = useJogo(mesFechado);
  const [erro, executar] = useAcao();
  return (
    <div className="cartao">
      <h3>ICMS</h3>
      {aPagar > 0 ? (
        <>
          <p className="painel-texto">
            ICMS apurado a pagar: <strong>{formatarReais(aPagar)}</strong>
          </p>
          <button
            type="button"
            className="botao-principal"
            onClick={() => executar(() => jogoStore.getState().pagarIcms())}
          >
            Pagar pelo banco
          </button>
        </>
      ) : (
        <p className="painel-texto">
          {fechado
            ? "O ICMS deste mês já foi apurado e não há imposto a pagar."
            : `Não há ICMS apurado a pagar. A apuração é feita no último dia do mês (dia ${DIAS_NO_MES}).`}
        </p>
      )}
      {erro && <Aviso>{erro}</Aviso>}
    </div>
  );
}

/** Painel que abre quando o avatar chega a um estabelecimento. */
export function PainelDoEstabelecimento({ estabelecimento }: { readonly estabelecimento: string }) {
  const missao = useProximaMissao();
  const data = useJogo((jogo) => jogo.data);
  const aqui = missao?.estabelecimento === estabelecimento;

  let principal: ReactNode;
  if (missao && aqui && !missaoDisponivelHoje(missao, data)) {
    principal = (
      <div className="cartao">
        <p className="painel-sobretitulo">Capítulo {missao.capitulo}</p>
        <h3>{missao.titulo}</h3>
        <p className="painel-texto">
          O fechamento é feito no <strong>último dia do mês (dia {DIAS_NO_MES})</strong>. Hoje é dia{" "}
          {data.dia}: avance os dias no Calendário e volte aqui.
        </p>
      </div>
    );
  } else if (missao && aqui) {
    // A chave recomeça o ciclo quando a missão muda.
    principal = <FluxoDaMissao key={missao.id} missao={missao} />;
  } else {
    principal = (
      <div className="cartao">
        <p className="painel-texto">Ninguém aqui tem uma proposta para você agora.</p>
        {missao && (
          <p className="painel-nota">
            Próxima missão: “{missao.titulo}”, em {nomeDoEstabelecimento(missao.estabelecimento)}.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      {principal}
      {estabelecimento === "banco" && (
        <div className="painel-secao cartao">
          <h3>Títulos</h3>
          <ListaDeTitulos comAcoes />
        </div>
      )}
      {estabelecimento === "posto-fiscal" && (
        <div className="painel-secao">
          <PainelDoIcms />
        </div>
      )}
      {estabelecimento === "escritorio-contabil" && (
        <div className="painel-secao">
          <PainelDoEscritorio />
        </div>
      )}
    </>
  );
}

/** Atalho de Missões: qual é a missão atual e aonde ir. */
export function PainelDeMissoes() {
  const missao = useProximaMissao();
  const data = useJogo((jogo) => jogo.data);
  if (!missao) {
    return (
      <div className="cartao">
        <p className="painel-texto">Você concluiu todas as missões da campanha.</p>
      </div>
    );
  }
  return (
    <article className="cartao">
      <p className="painel-sobretitulo">Capítulo {missao.capitulo}</p>
      <h3>{missao.titulo}</h3>
      <p className="painel-texto">
        Vá até <strong>{nomeDoEstabelecimento(missao.estabelecimento)}</strong>: toque no prédio com
        o balão <span className="sinal-oferta">!</span> no mapa.
      </p>
      {!missaoDisponivelHoje(missao, data) && (
        <p className="painel-nota">
          Essa missão é do fechamento: só pode ser feita no último dia do mês (dia {DIAS_NO_MES}).
        </p>
      )}
    </article>
  );
}

/** Calendário: o dia, as ações que restam, os vencimentos e a virada do dia e do mês. */
export function PainelDoCalendario() {
  const data = useJogo((jogo) => jogo.data);
  const restantes = useJogo(acoesRestantes);
  const fechado = useJogo(mesFechado);
  const missao = useProximaMissao();
  const [erro, executar] = useAcao();
  const ultimoDia = ehUltimoDiaDoMes(data);
  const fechamentoPelaCampanha = missao !== undefined && missaoDeFechamento(missao);

  return (
    <>
      <div className="cartao">
        <p className="painel-sobretitulo">
          Mês {data.mes} · Ano {data.ano}
        </p>
        <h3>
          Dia {data.dia} de {DIAS_NO_MES}
        </h3>
        <p className="painel-texto" data-acoes={restantes}>
          Ações de hoje: <strong>{restantes}</strong> de {ACOES_POR_DIA}. Cada operação gasta uma
          ação.
        </p>

        {ultimoDia && !fechado && (
          <p className="painel-texto">
            <strong>Hoje é o último dia do mês.</strong>{" "}
            {fechamentoPelaCampanha
              ? `Faça o fechamento pela missão “${missao.titulo}”, em ${nomeDoEstabelecimento(missao.estabelecimento)}.`
              : "Antes de virar o mês, lance a depreciação e apure o ICMS."}
          </p>
        )}
        {ultimoDia && fechado && (
          <p className="painel-texto">
            <strong>Mês fechado.</strong> Encerre o dia para começar o próximo mês.
          </p>
        )}

        {ultimoDia && !fechado && !fechamentoPelaCampanha && (
          <button
            type="button"
            className="botao-principal"
            onClick={() => executar(() => jogoStore.getState().fecharMes())}
          >
            Fechar o mês
          </button>
        )}
        {(!ultimoDia || fechado) && (
          <button
            type="button"
            className="botao-principal"
            onClick={() => executar(() => jogoStore.getState().encerrarDia())}
          >
            Encerrar o dia
          </button>
        )}
        {!ultimoDia && (
          <button
            type="button"
            className="botao-secundario"
            onClick={() => executar(() => jogoStore.getState().irParaOUltimoDia())}
          >
            Ir para o último dia do mês
          </button>
        )}
        {erro && <Aviso>{erro}</Aviso>}
      </div>

      <div className="painel-secao cartao">
        <h3>Vencimentos</h3>
        <ListaDeTitulos comAcoes={false} />
        <p className="painel-nota">Pagamentos e recebimentos são feitos no Banco.</p>
      </div>
    </>
  );
}

export function PainelDeProgresso() {
  const pontos = useJogo((jogo) => jogo.pontos);
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  return (
    <div className="cartao painel-progresso">
      <p className="painel-texto">
        <strong>{pontos}</strong> pontos
      </p>
      <p className="painel-texto">
        <strong>
          {concluidas.length} de {conteudo.missoes.length}
        </strong>{" "}
        missões concluídas
      </p>
      <p className="painel-nota">O progresso por conceito entra numa próxima versão.</p>
    </div>
  );
}
