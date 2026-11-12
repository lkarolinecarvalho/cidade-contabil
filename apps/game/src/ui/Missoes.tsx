import type { Missao } from "@cidade/content";
import { proximaMissao } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";
import { IconeCerto } from "./icones";
import { proximoDestino } from "./ProximoDestino";

export type SituacaoDaMissao = "concluida" | "atual" | "em_breve";

export interface CapituloComMissoes {
  readonly numero: number;
  readonly titulo: string;
  readonly concluidas: number;
  readonly missoes: readonly { readonly missao: Missao; readonly situacao: SituacaoDaMissao }[];
}

/** A campanha por capítulo, com a situação de cada missão para o jogador. */
export function campanhaPorCapitulo(missoesConcluidas: readonly string[]): CapituloComMissoes[] {
  const atual = proximaMissao({ missoesConcluidas }, conteudo.missoes);
  return conteudo.capitulos.map((capitulo) => {
    const missoes = conteudo.missoes
      .filter((m) => m.capitulo === capitulo.numero)
      .map((missao) => ({
        missao,
        situacao: missoesConcluidas.includes(missao.id)
          ? ("concluida" as const)
          : missao.id === atual?.id
            ? ("atual" as const)
            : ("em_breve" as const),
      }));
    return {
      numero: capitulo.numero,
      titulo: capitulo.titulo,
      concluidas: missoes.filter((m) => m.situacao === "concluida").length,
      missoes,
    };
  });
}

const nomeDoEstabelecimento = (id: string): string =>
  conteudo.estabelecimentos.find((e) => e.id === id)?.nome ?? id;

/** Atalho de Missões: a campanha inteira, com o que já foi feito, a missão atual e o que vem. */
export function PainelDeMissoes() {
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  const hoje = useJogo((jogo) => jogo.data);
  const capitulos = campanhaPorCapitulo(concluidas);
  const atual = proximaMissao({ missoesConcluidas: concluidas }, conteudo.missoes);
  const destino = proximoDestino(atual, hoje);

  return (
    <>
      <div className="cartao missao-atual">
        {atual && destino ? (
          <>
            <p className="painel-sobretitulo">Missão atual</p>
            <h3>{atual.titulo}</h3>
            <p className="painel-texto">
              <strong>{destino.instrucao}.</strong> Toque no prédio com o balão{" "}
              <span className="sinal-oferta">!</span> no mapa.
            </p>
            {destino.missao !== atual.titulo && <p className="painel-nota">{destino.missao}.</p>}
          </>
        ) : (
          <>
            <p className="painel-sobretitulo">Campanha concluída</p>
            <p className="painel-texto">
              Você fez todas as missões. Continue cuidando da casa: pague e receba os títulos no
              Banco e feche os meses pelo Calendário.
            </p>
          </>
        )}
      </div>

      {capitulos.map((capitulo) => (
        <section key={capitulo.numero} className="painel-secao cartao capitulo">
          <header className="capitulo-cabecalho">
            <h3>
              <small>Capítulo {capitulo.numero}</small>
              {capitulo.titulo}
            </h3>
            <span
              className={
                capitulo.concluidas === capitulo.missoes.length
                  ? "capitulo-conta completo"
                  : "capitulo-conta"
              }
            >
              {capitulo.concluidas} de {capitulo.missoes.length}
            </span>
          </header>
          <ol className="lista-de-missoes">
            {capitulo.missoes.map(({ missao, situacao }) => (
              <li key={missao.id} className={situacao}>
                <span className="missao-marca" aria-hidden="true">
                  {situacao === "concluida" ? <IconeCerto /> : situacao === "atual" ? "!" : ""}
                </span>
                <span className="missao-texto">
                  <strong>{missao.titulo}</strong>
                  <span>{nomeDoEstabelecimento(missao.estabelecimento)}</span>
                </span>
                <span className="missao-situacao">
                  {situacao === "concluida" ? "feita" : situacao === "atual" ? "agora" : "em breve"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
