import type { Missao } from "@cidade/content";
import type { DataJogo } from "@cidade/ledger";
import { DIAS_NO_MES } from "../state/calendario";
import { missaoDisponivelHoje, proximaMissao } from "../state/jogo";
import { conteudo, useJogo } from "../state/store";

/** "Vá ao Banco", "Vá à Hamburgueria": a preposição certa para cada estabelecimento. */
const DESTINO: Readonly<Record<string, string>> = {
  "minha-loja": "à Hamburgueria",
  fornecedor: "ao Fornecedor",
  banco: "ao Banco",
  "escritorio-contabil": "ao Escritório Contábil",
  "posto-fiscal": "ao Posto Fiscal",
  imobiliaria: "à Imobiliária",
};

export interface Destino {
  /** Frase curta com o que fazer agora. */
  readonly instrucao: string;
  /** Título da missão que espera o jogador lá. */
  readonly missao: string;
}

/** O que o jogador deve fazer agora para seguir a campanha. `null` quando ela acabou. */
export function proximoDestino(missao: Missao | undefined, hoje: DataJogo): Destino | null {
  if (!missao) return null;
  const lugar = DESTINO[missao.estabelecimento] ?? `a ${missao.estabelecimento}`;
  if (!missaoDisponivelHoje(missao, hoje)) {
    // O fechamento só acontece no último dia: antes, é preciso avançar o calendário.
    return {
      instrucao: `No dia ${DIAS_NO_MES}, vá ${lugar}`,
      missao: "Avance os dias no Calendário para fechar o mês",
    };
  }
  return { instrucao: `Vá ${lugar}`, missao: missao.titulo };
}

/**
 * Aviso que aparece sobre o mapa com o próximo destino da campanha. Reaparece, com uma
 * animação, sempre que a missão muda. Tocar nele abre a lista de missões.
 */
export function ProximoDestino({ aoAbrirMissoes }: { readonly aoAbrirMissoes: () => void }) {
  const concluidas = useJogo((jogo) => jogo.missoesConcluidas);
  const hoje = useJogo((jogo) => jogo.data);
  const missao = proximaMissao({ missoesConcluidas: concluidas }, conteudo.missoes);
  const destino = proximoDestino(missao, hoje);
  if (!destino) return null;
  return (
    // A chave refaz a animação quando o destino muda.
    <button
      type="button"
      className="destino"
      key={destino.instrucao + destino.missao}
      onClick={aoAbrirMissoes}
    >
      <span className="destino-sinal" aria-hidden="true">
        !
      </span>
      <span className="destino-texto">
        {destino.instrucao}
        <small>{destino.missao}</small>
      </span>
    </button>
  );
}
