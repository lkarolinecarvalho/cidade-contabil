import { balanco } from "@cidade/ledger";
import { useState } from "react";
import { proximaMissao } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";

/** Missão atual. No M5 o botão dá lugar ao ciclo negociar → efeito → afirmativas → lançamento. */
export function PainelDeMissoes() {
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  const concluirMissao = useJogo((jogo) => jogo.concluirMissao);
  const [erro, setErro] = useState<string | null>(null);

  const missao = proximaMissao({ missoesConcluidas: concluidas }, conteudo.missoes);
  if (!missao) {
    return <p className="painel-texto">Você concluiu todas as missões da campanha.</p>;
  }
  const npc = conteudo.npcs.find((n) => n.id === missao.npc);
  const local = conteudo.estabelecimentos.find((e) => e.id === missao.estabelecimento);

  const concluir = () => {
    try {
      concluirMissao(missao);
      setErro(null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir a missão.");
    }
  };

  return (
    <article className="painel-missao">
      <p className="painel-sobretitulo">
        Capítulo {missao.capitulo} · {local?.nome}
      </p>
      <h3>{missao.titulo}</h3>
      {missao.dialogo.map((fala) => (
        <p key={fala.texto} className="painel-fala">
          <strong>{fala.fala === "npc" ? npc?.nome : "Você"}:</strong> {fala.texto}
        </p>
      ))}
      {erro && (
        <p className="painel-erro" role="alert">
          {erro}
        </p>
      )}
      <button type="button" className="botao-principal" onClick={concluir}>
        Concluir missão (+{missao.recompensa.pontos} pts)
      </button>
      <p className="painel-nota">
        Provisório: por enquanto a missão é concluída direto. As afirmativas e o lançamento entram
        numa próxima versão.
      </p>
    </article>
  );
}

/** Resumo do Balanço, lido do razão. Diário, Razão, DRE e Revisão entram nos próximos marcos. */
export function PainelDoEscritorio() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const bp = balanco(contabil, data);
  const linhas: readonly (readonly [string, number])[] = [
    ...bp.ativo.circulante.map((l) => [l.nome, l.valorCentavos] as const),
    ["Imobilizado (líquido)", bp.ativo.totalNaoCirculanteCentavos],
  ];

  return (
    <div className="painel-balanco">
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
    <div className="painel-progresso">
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
