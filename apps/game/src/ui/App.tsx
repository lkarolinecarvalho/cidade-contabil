import { type ReactNode, useCallback, useEffect, useState } from "react";
import { bus } from "../bus";
import { titulosEmAlerta } from "../state/calendario";
import { bancosDaEmpresa, caixaDaEmpresa, nivelDoJogador } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";
import { BottomSheet } from "./BottomSheet";
import { Hud } from "./Hud";
import {
  IconeAperto,
  IconeBalanca,
  IconeBarras,
  IconeCalendario,
  IconeEngrenagem,
  IconeMapa,
} from "./icones";
import {
  PainelDasDemonstracoes,
  PainelDeConfiguracoes,
  PainelDeMissoes,
  PainelDeProgresso,
  PainelDoCalendario,
  PainelDoEscritorio,
  PainelDoEstabelecimento,
} from "./paineis";

/** Nome da empresa do jogador na campanha (docs/campanha.md). */
const EMPRESA = "Mercado Vila Nova";

type Atalho = "missoes" | "calendario" | "escritorio" | "progresso";
/** Painéis abertos por um botão: os atalhos da base e, no HUD, as Configurações e o Balanço. */
type PainelFixo = Atalho | "configuracoes" | "balanco";

/** Painel aberto: um dos atalhos da base ou o estabelecimento a que o avatar chegou. */
type Painel =
  | { readonly tipo: "atalho"; readonly atalho: PainelFixo }
  | { readonly tipo: "estabelecimento"; readonly estabelecimento: string };

interface DefinicaoDoAtalho {
  /** Texto curto do botão na base da tela. */
  readonly rotulo: string;
  readonly titulo: string;
  readonly icone: () => ReactNode;
  readonly conteudo: () => ReactNode;
}

const ATALHOS: Readonly<Record<PainelFixo, DefinicaoDoAtalho>> = {
  missoes: {
    rotulo: "Missões",
    titulo: "Missões",
    icone: () => <IconeMapa />,
    conteudo: () => <PainelDeMissoes />,
  },
  calendario: {
    rotulo: "Calendário",
    titulo: "Calendário",
    icone: () => <IconeCalendario />,
    conteudo: () => <PainelDoCalendario />,
  },
  escritorio: {
    rotulo: "Escritório",
    titulo: "Escritório Contábil",
    icone: () => <IconeBalanca />,
    conteudo: () => <PainelDoEscritorio />,
  },
  balanco: {
    rotulo: "Balanço",
    titulo: "Balanço e DRE",
    icone: () => <IconeBalanca />,
    conteudo: () => <PainelDasDemonstracoes />,
  },
  configuracoes: {
    rotulo: "Configurações",
    titulo: "Configurações",
    icone: () => <IconeEngrenagem />,
    conteudo: () => <PainelDeConfiguracoes />,
  },
  progresso: {
    rotulo: "Progresso",
    titulo: "Progresso",
    icone: () => <IconeBarras />,
    conteudo: () => <PainelDeProgresso />,
  },
};

function tituloDo(painel: Painel): string {
  if (painel.tipo === "atalho") return ATALHOS[painel.atalho].titulo;
  const estabelecimento = conteudo.estabelecimentos.find((e) => e.id === painel.estabelecimento);
  return estabelecimento?.nome ?? painel.estabelecimento;
}

function iconeDo(painel: Painel): ReactNode {
  if (painel.tipo === "atalho") return ATALHOS[painel.atalho].icone();
  return painel.estabelecimento === "escritorio-contabil" ? <IconeBalanca /> : <IconeAperto />;
}

function conteudoDo(painel: Painel): ReactNode {
  if (painel.tipo === "atalho") return ATALHOS[painel.atalho].conteudo();
  return <PainelDoEstabelecimento estabelecimento={painel.estabelecimento} />;
}

const NA_BASE: readonly Atalho[] = ["missoes", "calendario", "escritorio", "progresso"];

/** Raiz da UI em React: HUD no topo, atalhos na base e os painéis em bottom sheet. */
export function App() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [mundoPronto, setMundoPronto] = useState(false);

  // Valores primitivos: o HUD só redesenha quando o número muda de fato.
  const carteiraCentavos = useJogo((jogo) => jogo.carteiraCentavos);
  const caixaCentavos = useJogo((jogo) => caixaDaEmpresa(jogo.contabil));
  const bancosCentavos = useJogo((jogo) => bancosDaEmpresa(jogo.contabil));
  const pontos = useJogo((jogo) => jogo.pontos);
  const data = useJogo((jogo) => jogo.data);
  const nivel = useJogo((jogo) => nivelDoJogador(jogo, conteudo.missoes));
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas.length);
  const alertas = useJogo((jogo) => titulosEmAlerta(jogo.titulos, jogo.data).length);

  useEffect(() => {
    const cancelarPronto = bus.ouvir("mundo:pronto", () => setMundoPronto(true));
    // Andar até um estabelecimento abre o painel dele.
    const cancelarChegada = bus.ouvir("estabelecimento:alcancado", ({ estabelecimento }) =>
      setPainel({ tipo: "estabelecimento", estabelecimento }),
    );
    // Só agora o mundo pode ser criado: a UI já está ouvindo.
    bus.emitir("ui:pronta", undefined);
    return () => {
      cancelarPronto();
      cancelarChegada();
    };
  }, []);

  useEffect(() => {
    bus.emitir("painel:mudou", { aberto: painel !== null });
  }, [painel]);

  const fechar = useCallback(() => setPainel(null), []);

  return (
    <>
      <Hud
        empresa={EMPRESA}
        nivel={nivel}
        progresso={concluidas / conteudo.missoes.length}
        carteiraCentavos={carteiraCentavos}
        caixaCentavos={caixaCentavos}
        bancosCentavos={bancosCentavos}
        pontos={pontos}
        data={data}
        aoVerBalanco={() => setPainel({ tipo: "atalho", atalho: "balanco" })}
        aoAbrirConfiguracoes={() => setPainel({ tipo: "atalho", atalho: "configuracoes" })}
      />
      {!mundoPronto && <p className="carregando">Carregando a cidade…</p>}
      <nav className="atalhos" aria-label="Atalhos">
        {NA_BASE.map((atalho) => (
          <button key={atalho} type="button" onClick={() => setPainel({ tipo: "atalho", atalho })}>
            {ATALHOS[atalho].icone()}
            {ATALHOS[atalho].rotulo}
            {atalho === "calendario" && alertas > 0 && (
              <span className="selo" role="status" aria-label={` título(s) vencendo`}>
                {alertas}
              </span>
            )}
          </button>
        ))}
      </nav>
      <BottomSheet
        aberto={painel !== null}
        titulo={painel ? tituloDo(painel) : ""}
        icone={painel ? iconeDo(painel) : null}
        aoFechar={fechar}
      >
        {painel && conteudoDo(painel)}
      </BottomSheet>
    </>
  );
}
