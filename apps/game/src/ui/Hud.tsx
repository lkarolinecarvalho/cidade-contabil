import type { Centavos, DataJogo } from "@cidade/ledger";
import { formatarReais } from "../texto/dinheiro";

export interface DadosDoHud {
  readonly nivel: number;
  /** Dinheiro da pessoa física do avatar: fora da contabilidade (ADR-0004). */
  readonly carteiraCentavos: Centavos;
  /** Caixa + Bancos da empresa, lidos do razão. */
  readonly disponibilidadesCentavos: Centavos;
  readonly pontos: number;
  readonly data: DataJogo;
}

/**
 * Topo da tela. Mostra lado a lado, com rótulos diferentes, o dinheiro do avatar e o
 * da empresa: são patrimônios distintos (princípio da entidade).
 */
export function Hud({
  nivel,
  carteiraCentavos,
  disponibilidadesCentavos,
  pontos,
  data,
}: DadosDoHud) {
  return (
    <header className="hud">
      <div className="hud-linha">
        <span className="hud-nivel">Nível {nivel}</span>
        <span className="hud-data">
          Dia {data.dia} · Mês {data.mes}
        </span>
        <span className="hud-pontos">{pontos} pts</span>
      </div>
      <div className="hud-linha">
        <div className="hud-saldo hud-saldo-pessoal">
          <span className="hud-rotulo">Sua carteira</span>
          <strong>{formatarReais(carteiraCentavos)}</strong>
          <span className="hud-nota">pessoa física</span>
        </div>
        <div className="hud-saldo hud-saldo-empresa">
          <span className="hud-rotulo">Caixa da empresa</span>
          <strong>{formatarReais(disponibilidadesCentavos)}</strong>
          <span className="hud-nota">Caixa + Bancos</span>
        </div>
      </div>
    </header>
  );
}
