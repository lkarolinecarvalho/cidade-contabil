import type { Missao } from "@cidade/content";
import { balanco, dre } from "@cidade/ledger";
import { proximaMissao } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { FluxoDaMissao } from "./FluxoDaMissao";

const nomeDoEstabelecimento = (id: string): string =>
  conteudo.estabelecimentos.find((e) => e.id === id)?.nome ?? id;

function useProximaMissao(): Missao | undefined {
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  return proximaMissao({ missoesConcluidas: concluidas }, conteudo.missoes);
}
/** Painel que abre quando o avatar chega a um estabelecimento. */
export function PainelDoEstabelecimento({ estabelecimento }: { readonly estabelecimento: string }) {
  const missao = useProximaMissao();
  const aqui = missao?.estabelecimento === estabelecimento;

  return (
    <>
      {missao && aqui ? (
        // A chave recomeça o ciclo quando a missão muda.
        <FluxoDaMissao key={missao.id} missao={missao} />
      ) : (
        <div className="cartao">
          <p className="painel-texto">Ninguém aqui tem uma proposta para você agora.</p>
          {missao && (
            <p className="painel-nota">
              Próxima missão: “{missao.titulo}”, em {nomeDoEstabelecimento(missao.estabelecimento)}.
            </p>
          )}
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
    </article>
  );
}

/** Resumo do Balanço, lido do razão. Diário, Razão, DRE e Revisão entram nos próximos marcos. */
function PainelDoBalanco() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const bp = balanco(contabil, data);
  const linhas: readonly (readonly [string, number])[] = [
    ...bp.ativo.circulante.map((l) => [l.nome, l.valorCentavos] as const),
    ["Imobilizado (líquido)", bp.ativo.totalNaoCirculanteCentavos],
  ];

  return (
    <div className="cartao painel-balanco">
      <h3>Balanço Patrimonial</h3>
      <table>
        <tbody>
          {linhas
            .filter(([, valor]) => valor !== 0)
            .map(([nome, valor]) => (
              <tr key={nome}>
                <td>{nome}</td>
                <td>{formatarReais(valor)}</td>
              </tr>
            ))}
          <tr className="total">
            <td>Total do Ativo</td>
            <td>{formatarReais(bp.ativo.totalCentavos)}</td>
          </tr>
          <tr>
            <td>Passivo Circulante</td>
            <td>{formatarReais(bp.passivo.totalCirculanteCentavos)}</td>
          </tr>
          <tr>
            <td>Patrimônio Líquido</td>
            <td>{formatarReais(bp.patrimonioLiquido.totalCentavos)}</td>
          </tr>
          <tr className="total">
            <td>Total do Passivo + PL</td>
            <td>{formatarReais(bp.totalPassivoEPatrimonioLiquidoCentavos)}</td>
          </tr>
        </tbody>
      </table>
      <p className="painel-nota">
        A sua carteira pessoal não aparece aqui: ela não é patrimônio da empresa.
      </p>
    </div>
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

/** DRE do mês corrente, lida do razão (R-DEM-02). */
function PainelDaDre() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const d = dre(contabil, { de: { ...data, dia: 1 }, ate: { ...data, dia: 31 } });
  const menos = (valor: number) => `(${formatarReais(valor)})`;
  const comValor = (linhas: typeof d.deducoes) => linhas.filter((l) => l.valorCentavos !== 0);

  return (
    <div className="cartao painel-balanco">
      <h3>DRE do mês</h3>
      <table>
        <tbody>
          <tr>
            <td>Receita Bruta de Vendas</td>
            <td>{formatarReais(d.totalReceitaBrutaCentavos)}</td>
          </tr>
          {comValor(d.deducoes).map((l) => (
            <tr key={l.conta}>
              <td>(−) {l.nome}</td>
              <td>{menos(l.valorCentavos)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>= Receita Líquida</td>
            <td>{formatarReais(d.receitaLiquidaCentavos)}</td>
          </tr>
          <tr>
            <td>(−) CMV</td>
            <td>{menos(d.totalCustosCentavos)}</td>
          </tr>
          <tr className="total">
            <td>= Lucro Bruto</td>
            <td>{formatarReais(d.lucroBrutoCentavos)}</td>
          </tr>
          {comValor(d.despesasOperacionais).map((l) => (
            <tr key={l.conta}>
              <td>(−) {l.nome}</td>
              <td>{menos(l.valorCentavos)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>= Resultado do período{d.resultadoCentavos < 0 ? " (prejuízo)" : ""}</td>
            <td>{formatarReais(d.resultadoCentavos)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Escritório Contábil: Balanço e DRE. Diário, Razão e Revisão entram nos próximos marcos. */
export function PainelDoEscritorio() {
  return (
    <>
      <PainelDoBalanco />
      <div className="painel-secao">
        <PainelDaDre />
      </div>
    </>
  );
}
