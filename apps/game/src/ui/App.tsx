import { type ReactNode, useCallback, useEffect, useState } from "react";
import { bus } from "../bus";
import { disponibilidadesDaEmpresa, nivelDoJogador } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";
import { BottomSheet } from "./BottomSheet";
import { Hud } from "./Hud";
import { PainelDeMissoes, PainelDeProgresso, PainelDoEscritorio } from "./paineis";

type Painel = "missoes" | "escritorio" | "progresso";

interface DefinicaoDoPainel {
  /** Texto curto do atalho na base da tela. */
  readonly atalho: string;
  readonly titulo: string;
  readonly conteudo: () => ReactNode;
}

const PAINEIS: Readonly<Record<Painel, DefinicaoDoPainel>> = {
  missoes: { atalho: "Missões", titulo: "Missões", conteudo: () => <PainelDeMissoes /> },
  escritorio: {
    atalho: "Escritório",
    titulo: "Escritório Contábil",
    conteudo: () => <PainelDoEscritorio />,
  },
  progresso: { atalho: "Progresso", titulo: "Progresso", conteudo: () => <PainelDeProgresso /> },
};

/** Raiz da UI em React: HUD no topo, atalhos na base e os painéis em bottom sheet. */
export function App() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [mundoPronto, setMundoPronto] = useState(false);

  // Valores primitivos: o HUD só redesenha quando o número muda de fato.
  const carteiraCentavos = useJogo((jogo) => jogo.carteiraCentavos);
  const disponibilidadesCentavos = useJogo((jogo) => disponibilidadesDaEmpresa(jogo.contabil));
  const pontos = useJogo((jogo) => jogo.pontos);
  const data = useJogo((jogo) => jogo.data);
  const nivel = useJogo((jogo) => nivelDoJogador(jogo, conteudo.missoes));

  useEffect(() => {
    const cancelar = bus.ouvir("mundo:pronto", () => setMundoPronto(true));
    // Só agora o mundo pode ser criado: a UI já está ouvindo.
    bus.emitir("ui:pronta", undefined);
    return cancelar;
  }, []);

  useEffect(() => {
    bus.emitir("painel:mudou", { aberto: painel !== null });
  }, [painel]);

  const fechar = useCallback(() => setPainel(null), []);
  const aberto = painel ? PAINEIS[painel] : null;

  return (
    <>
      <Hud
        nivel={nivel}
        carteiraCentavos={carteiraCentavos}
        disponibilidadesCentavos={disponibilidadesCentavos}
        pontos={pontos}
        data={data}
      />
      {!mundoPronto && <p className="carregando">Carregando a cidade…</p>}
      <nav className="atalhos" aria-label="Atalhos">
        {(Object.keys(PAINEIS) as Painel[]).map((id) => (
          <button key={id} type="button" onClick={() => setPainel(id)}>
            {PAINEIS[id].atalho}
          </button>
        ))}
      </nav>
      <BottomSheet aberto={aberto !== null} titulo={aberto?.titulo ?? ""} aoFechar={fechar}>
        {aberto?.conteudo()}
      </BottomSheet>
    </>
  );
}
