import type { Centavos, DataJogo } from "@cidade/ledger";
import { formatarReais } from "../texto/dinheiro";
import {
  IconeCalendario,
  IconeCarteira,
  IconeEngrenagem,
  IconeEstrela,
  IconeMoeda,
  Retrato,
} from "./icones";

export interface DadosDoHud {
  readonly empresa: string;
  readonly nivel: number;
  /** Avanço na campanha, de 0 a 1. */
  readonly progresso: number;
  /** Dinheiro da pessoa física do avatar: fora da contabilidade (ADR-0004). */
  readonly carteiraCentavos: Centavos;
  /** Caixa + Bancos da empresa, lidos do razão. */
  readonly disponibilidadesCentavos: Centavos;
  readonly pontos: number;
  readonly data: DataJogo;
  readonly aoAbrirConfiguracoes?: () => void;
}

/**
 * Topo da tela. Mostra lado a lado, com rótulos e ícones diferentes, o dinheiro do
 * avatar e o da empresa: são patrimônios distintos (princípio da entidade).
 */
export function Hud({
  empresa,
  nivel,
  progresso,
  carteiraCentavos,
  disponibilidadesCentavos,
  pontos,
  data,
  aoAbrirConfiguracoes,
}: DadosDoHud) {
  const porcentagem = Math.round(Math.min(Math.max(progresso, 0), 1) * 100);
  return (
    <header className="hud">
      <div className="hud-linha">
        <div className="hud-perfil">
          <Retrato personagem="avatar" nome="Você" />
          <div className="hud-perfil-texto">
            <strong>{empresa}</strong>
            <span>Nível {nivel}</span>
            <span
              className="hud-barra"
              role="progressbar"
              aria-label="Avanço na campanha"
              aria-valuenow={porcentagem}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${porcentagem}%` }} />
            </span>
          </div>
        </div>
        <div className="hud-direita">
          <div className="hud-topo">
            <span className="chip">
              <IconeEstrela />
              {pontos} pts
            </span>
            {aoAbrirConfiguracoes && (
              <button
                type="button"
                className="chip chip-botao"
                aria-label="Configurações"
                onClick={aoAbrirConfiguracoes}
              >
                <IconeEngrenagem />
              </button>
            )}
          </div>
          <span className="chip">
            <IconeCalendario />
            Dia {data.dia} · Mês {data.mes}
          </span>
        </div>
      </div>
      <div className="hud-linha">
        <div className="chip chip-saldo chip-pessoal">
          <IconeCarteira />
          <span className="chip-texto">
            <span className="chip-rotulo">Sua carteira</span>
            <strong>{formatarReais(carteiraCentavos)}</strong>
          </span>
        </div>
        <div className="chip chip-saldo chip-empresa">
          <IconeMoeda />
          <span className="chip-texto">
            <span className="chip-rotulo">Caixa da empresa</span>
            <strong>{formatarReais(disponibilidadesCentavos)}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}
