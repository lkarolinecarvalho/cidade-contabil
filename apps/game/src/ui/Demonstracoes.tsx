import { balanco, dre } from "@cidade/ledger";
import { DIAS_NO_MES } from "../state/calendario";
import { useJogo } from "../state/store";
import { formatarReais } from "../texto/dinheiro";

/** Resumo do Balanço, lido do razão (R-DEM-03). */
export function PainelDoBalanco() {
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

/** DRE do mês corrente, lida do razão (R-DEM-02). */
export function PainelDaDre() {
  const contabil = useJogo((jogo) => jogo.contabil);
  const data = useJogo((jogo) => jogo.data);
  const d = dre(contabil, { de: { ...data, dia: 1 }, ate: { ...data, dia: DIAS_NO_MES } });
  const menos = (valor: number) => `(${formatarReais(valor)})`;
  const comValor = (linhas: typeof d.deducoes) => linhas.filter((l) => l.valorCentavos !== 0);

  return (
    <div className="cartao painel-balanco">
      <h3>DRE do mês {data.mes}</h3>
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
          {/* Sem vendas, a linha do custo aparece zerada; com vendas, uma por conta (CMV, CPV). */}
          {comValor(d.custos).length === 0 ? (
            <tr>
              <td>(−) Custo das vendas</td>
              <td>{menos(0)}</td>
            </tr>
          ) : (
            comValor(d.custos).map((l) => (
              <tr key={l.conta}>
                <td>(−) {l.nome}</td>
                <td>{menos(l.valorCentavos)}</td>
              </tr>
            ))
          )}
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
          {/* R-DSC-02, R-DSC-04: descontos financeiros obtidos e concedidos. */}
          {comValor(d.receitasFinanceiras).map((l) => (
            <tr key={l.conta}>
              <td>(+) {l.nome}</td>
              <td>{formatarReais(l.valorCentavos)}</td>
            </tr>
          ))}
          {comValor(d.despesasFinanceiras).map((l) => (
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
