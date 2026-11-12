import type { Centavos, DataJogo } from "@cidade/ledger";
import { useState } from "react";
import { formatarReais } from "../texto/dinheiro";
import { IconeEngrenagem, IconeEstrela, IconeSeta, Retrato } from "./icones";

export interface DadosDoHud {
  readonly empresa: string;
  readonly nivel: number;
  /** Avanço na campanha, de 0 a 1. */
  readonly progresso: number;
  /** Dinheiro da pessoa física do avatar: fora da contabilidade (ADR-0004). */
  readonly carteiraCentavos: Centavos;
  /** Saldos das contas Caixa e Bancos da empresa, lidos do razão. */
  readonly caixaCentavos: Centavos;
  readonly bancosCentavos: Centavos;
  readonly pontos: number;
  readonly data: DataJogo;
  /** Começa com o detalhe aberto. Por padrão, só a barra aparece. */
  readonly abertoDeInicio?: boolean;
  readonly aoVerBalanco?: () => void;
  readonly aoAbrirConfiguracoes?: () => void;
}

/**
 * Topo da tela. Fechado, é uma barra com o dinheiro da empresa e a data; tocar nela
 * abre o detalhe. Lá, a carteira do avatar e o dinheiro da empresa ficam em quadros
 * separados: são patrimônios distintos (princípio da entidade).
 */
export function Hud({
  empresa,
  nivel,
  progresso,
  carteiraCentavos,
  caixaCentavos,
  bancosCentavos,
  pontos,
  data,
  abertoDeInicio = false,
  aoVerBalanco,
  aoAbrirConfiguracoes,
}: DadosDoHud) {
  const [aberto, setAberto] = useState(abertoDeInicio);
  const porcentagem = Math.round(Math.min(Math.max(progresso, 0), 1) * 100);
  return (
    <header className="hud">
      <div className="hud-linha">
        <button
          type="button"
          className="hud-resumo"
          aria-expanded={aberto}
          aria-controls="hud-detalhe"
          onClick={() => setAberto(!aberto)}
        >
          <span className="hud-avatar">
            <Retrato personagem="avatar" nome="Você" />
            <span className="hud-selo" title={`Nível ${nivel}`}>
              {nivel}
            </span>
          </span>
          <span className="hud-resumo-texto">
            <span className="hud-rotulo hud-rotulo-empresa">Empresa</span>
            <strong>{formatarReais(caixaCentavos + bancosCentavos)}</strong>
          </span>
          <abbr className="hud-data" title={`Dia ${data.dia} do mês ${data.mes}`}>
            D{data.dia} · M{data.mes}
          </abbr>
          <IconeSeta paraCima={aberto} />
        </button>
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
      {aberto && (
        <section id="hud-detalhe" className="hud-detalhe" aria-label="Resumo da empresa">
          <div className="hud-titulo">
            <strong>{empresa}</strong>
            <span className="hud-pontos">
              <IconeEstrela />
              {pontos} pts
            </span>
          </div>
          <div className="hud-nivel">
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
            <span className="hud-porcentagem">{porcentagem}%</span>
          </div>
          <div className="hud-quadros">
            <div className="hud-quadro hud-quadro-pessoal">
              <span className="hud-rotulo">Sua carteira</span>
              <strong>{formatarReais(carteiraCentavos)}</strong>
              <span className="hud-nota">Fora da contabilidade</span>
            </div>
            <dl className="hud-quadro hud-quadro-empresa">
              <span className="hud-rotulo">Empresa</span>
              <div>
                <dt>Caixa</dt>
                <dd>{formatarReais(caixaCentavos)}</dd>
              </div>
              <div>
                <dt>Bancos</dt>
                <dd>{formatarReais(bancosCentavos)}</dd>
              </div>
            </dl>
          </div>
          {aoVerBalanco && (
            <button
              type="button"
              className="botao-principal hud-balanco"
              onClick={() => {
                setAberto(false);
                aoVerBalanco();
              }}
            >
              Ver Balanço
            </button>
          )}
        </section>
      )}
    </header>
  );
}
