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
 * Topo da tela: um painel com o perfil, os pontos e a data, e outro com os dois saldos.
 * O dinheiro do avatar e o da empresa aparecem lado a lado, com rótulos, ícones e
 * fundos diferentes: são patrimônios distintos (princípio da entidade).
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
        <div className="hud-painel hud-perfil">
          <Retrato personagem="avatar" nome="Você" />
          <div className="hud-perfil-texto">
            <strong>{empresa}</strong>
            <span className="hud-nivel">Nível {nivel}</span>
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
          <div className="hud-marcadores">
            <span className="hud-marcador">
              <IconeEstrela />
              {pontos} pts
            </span>
            <span className="hud-marcador">
              <IconeCalendario />
              Dia {data.dia} · Mês {data.mes}
            </span>
          </div>
        </div>
        {aoAbrirConfiguracoes && (
          <button
            type="button"
            className="hud-engrenagem"
            aria-label="Configurações"
            onClick={aoAbrirConfiguracoes}
          >
            <IconeEngrenagem />
          </button>
        )}
      </div>
      <div className="hud-painel hud-saldos">
        <div className="hud-saldo hud-saldo-pessoal">
          <IconeCarteira />
          <span className="hud-saldo-texto">
            <span className="hud-saldo-rotulo">Sua carteira</span>
            <strong>{formatarReais(carteiraCentavos)}</strong>
          </span>
        </div>
        <div className="hud-saldo hud-saldo-empresa">
          <IconeMoeda />
          <span className="hud-saldo-texto">
            <span className="hud-saldo-rotulo">Caixa da empresa</span>
            <strong>{formatarReais(disponibilidadesCentavos)}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}
