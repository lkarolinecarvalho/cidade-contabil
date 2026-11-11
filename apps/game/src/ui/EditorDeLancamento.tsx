import type { GrupoConta, Lado, Partida, SituacaoDaLinha } from "@cidade/ledger";
import { useState } from "react";
import {
  type Ajuda,
  type Conferencia,
  type LinhaEmEdicao,
  lerLinhas,
  linhasIniciais,
  linhaVazia,
  type ResumoPatrimonial,
} from "../orquestrador/lancamento";
import { useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";
import { Retrato } from "./icones";
import { RegraCitada } from "./RegraCitada";

const GRUPOS: readonly (readonly [string, readonly GrupoConta[]])[] = [
  ["Ativo", ["ativo_circulante", "imobilizado"]],
  ["Passivo", ["passivo_circulante"]],
  ["Patrimônio Líquido", ["patrimonio_liquido"]],
  ["Receitas e deduções", ["receita", "deducao_receita"]],
  ["Custos e despesas", ["custo", "despesa_operacional"]],
];

const AVISO: Readonly<Record<SituacaoDaLinha, string>> = {
  correta: "Certa",
  valor_incorreto: "O valor não é esse",
  lado_incorreto: "Esta conta entra do outro lado",
  conta_inesperada: "Esta conta não faz parte deste lançamento",
};

const INSTRUCAO: Readonly<Record<Ajuda, string>> = {
  pronto: "O lançamento já está montado. Confira e confirme.",
  contas_sugeridas: "As contas e os valores estão dados. Marque o que é débito e o que é crédito.",
  contas_e_valores: "Escolha a conta, o lado e o valor de cada linha.",
  livre: "Monte o lançamento: adicione as linhas de que precisar.",
};

const LINHAS_DA_PREVIA: readonly (readonly [keyof ResumoPatrimonial, string])[] = [
  ["ativoCirculanteCentavos", "Ativo Circulante"],
  ["ativoNaoCirculanteCentavos", "Ativo Não Circulante"],
  ["totalDoAtivoCentavos", "Total do Ativo"],
  ["passivoCentavos", "Passivo"],
  ["patrimonioLiquidoCentavos", "Patrimônio Líquido"],
  ["resultadoDoMesCentavos", "Resultado do mês"],
];

interface Props {
  readonly ajuda: Ajuda;
  readonly esperadas: readonly Partida[];
  /** Resultado da última conferência; `null` enquanto o jogador edita. */
  readonly conferencia: Conferencia | null;
  readonly aoConferir: (informado: readonly Partida[]) => void;
  readonly aoCorrigir: () => void;
  readonly aoVerResposta: () => void;
}

/** Editor do lançamento nos 4 níveis de ajuda, com o feedback linha a linha e a prévia do erro. */
export function EditorDeLancamento({
  ajuda,
  esperadas,
  conferencia,
  aoConferir,
  aoCorrigir,
  aoVerResposta,
}: Props) {
  const plano = useJogo((jogo) => jogo.contabil.planoDeContas);
  const [linhas, setLinhas] = useState<readonly LinhaEmEdicao[]>(() =>
    linhasIniciais(ajuda, esperadas),
  );
  const [proximoId, setProximoId] = useState(linhas.length);
  const [aviso, setAviso] = useState<string | null>(null);
  const travado = conferencia !== null;
  const nome = (conta: string) => plano.contas.find((c) => c.codigo === conta)?.nome ?? conta;

  const mudar = (id: number, mudanca: Partial<LinhaEmEdicao>) =>
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.id === id ? { ...linha, ...mudanca } : linha)),
    );

  const confirmar = () => {
    const leitura = lerLinhas(linhas);
    if (!leitura.ok) return setAviso(leitura.erro);
    setAviso(null);
    aoConferir(leitura.partidas);
  };

  return (
    <>
      <p className="etapa-instrucao">{INSTRUCAO[ajuda]}</p>
      <ul className="linhas">
        {linhas.map((linha, indice) => {
          const comparada = conferencia?.comparacao.linhas[indice];
          return (
            <li key={linha.id} className={comparada ? `conferida ${comparada.situacao}` : ""}>
              <div className="linha-campos">
                {linha.fixo.conta ? (
                  <span className="linha-conta">{nome(linha.conta)}</span>
                ) : (
                  <select
                    aria-label={`Conta da linha ${indice + 1}`}
                    value={linha.conta}
                    disabled={travado}
                    onChange={(e) => mudar(linha.id, { conta: e.target.value })}
                  >
                    <option value="">Selecione a conta</option>
                    {GRUPOS.map(([rotulo, grupos]) => (
                      <optgroup key={rotulo} label={rotulo}>
                        {plano.contas
                          .filter((c) => grupos.includes(c.grupo))
                          .map((c) => (
                            <option key={c.codigo} value={c.codigo}>
                              {c.nome}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                <span className="linha-lado">
                  {(["D", "C"] as const).map((lado: Lado) => (
                    <button
                      key={lado}
                      type="button"
                      aria-label={lado === "D" ? "Débito" : "Crédito"}
                      aria-pressed={linha.lado === lado}
                      disabled={travado || linha.fixo.lado}
                      onClick={() => mudar(linha.id, { lado })}
                    >
                      {lado}
                    </button>
                  ))}
                </span>
                {linha.fixo.valor ? (
                  <span className="linha-valor">{linha.valor}</span>
                ) : (
                  <input
                    aria-label={`Valor da linha ${indice + 1}`}
                    className="linha-valor"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={linha.valor}
                    disabled={travado}
                    onChange={(e) => mudar(linha.id, { valor: e.target.value })}
                  />
                )}
                {ajuda === "livre" && !travado && linhas.length > 1 && (
                  <button
                    type="button"
                    className="linha-remover"
                    aria-label={`Remover a linha ${indice + 1}`}
                    onClick={() => setLinhas((atuais) => atuais.filter((l) => l.id !== linha.id))}
                  >
                    ×
                  </button>
                )}
              </div>
              {comparada && comparada.situacao !== "correta" && (
                <div className="linha-aviso">
                  <strong>{AVISO[comparada.situacao]}.</strong>
                  {comparada.regras.slice(0, 1).map((regra) => (
                    <RegraCitada key={regra} regra={regra} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {ajuda === "livre" && !travado && (
        <button
          type="button"
          className="botao-secundario"
          onClick={() => {
            setLinhas((atuais) => [...atuais, linhaVazia(proximoId)]);
            setProximoId(proximoId + 1);
          }}
        >
          + Adicionar linha
        </button>
      )}

      {aviso && (
        <p className="painel-erro" role="alert">
          {aviso}
        </p>
      )}

      {conferencia === null ? (
        <button type="button" className="botao-principal" onClick={confirmar}>
          {ajuda === "pronto" ? "Confirmar o lançamento" : "Conferir o lançamento"}
        </button>
      ) : (
        <>
          {conferencia.comparacao.faltantes.length > 0 && (
            <div className="linha-aviso avulso">
              <strong>
                {conferencia.comparacao.faltantes.length === 1
                  ? "Falta uma conta neste lançamento."
                  : `Faltam ${conferencia.comparacao.faltantes.length} contas neste lançamento.`}
              </strong>
              {[
                ...new Set(conferencia.comparacao.faltantes.flatMap((f) => f.regras.slice(0, 1))),
              ].map((regra) => (
                <RegraCitada key={regra} regra={regra} />
              ))}
            </div>
          )}

          <div className="conversa contador">
            <div className="conversa-quem">
              <Retrato personagem="marta-contadora" nome="Marta" />
              <strong>Marta</strong>
              <span>Contadora</span>
            </div>
            <div className="conversa-falas">
              <p className="balao">{conferencia.comentario}</p>
            </div>
          </div>
          {conferencia.regras.map((regra) => (
            <RegraCitada key={regra} regra={regra} />
          ))}

          {conferencia.previa && (
            <table className="previa">
              <caption>Como ficariam o Balanço e a DRE</caption>
              <thead>
                <tr>
                  <th />
                  <th>Com o seu lançamento</th>
                  <th>Correto</th>
                </tr>
              </thead>
              <tbody>
                {/* Só o que muda: as contas afetadas e os totais que saem diferentes. */}
                {conferencia.previa.contas.map((conta) => (
                  <tr key={conta.conta} className="diferente">
                    <td>{conta.nome}</td>
                    <td>{formatarReais(conta.comOSeuLancamentoCentavos)}</td>
                    <td>{formatarReais(conta.corretoCentavos)}</td>
                  </tr>
                ))}
                {LINHAS_DA_PREVIA.map(([campo, rotulo]) => {
                  const seu = conferencia.previa?.comOSeuLancamento[campo] ?? 0;
                  const certo = conferencia.previa?.correto[campo] ?? 0;
                  if (seu === certo) return null;
                  return (
                    <tr key={campo} className="diferente total">
                      <td>{rotulo}</td>
                      <td>{formatarReais(seu)}</td>
                      <td>{formatarReais(certo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="julgar">
            <button type="button" className="neutro" onClick={aoCorrigir}>
              Corrigir
            </button>
            <button type="button" className="neutro" onClick={aoVerResposta}>
              Ver o lançamento correto
            </button>
          </div>
        </>
      )}
    </>
  );
}
