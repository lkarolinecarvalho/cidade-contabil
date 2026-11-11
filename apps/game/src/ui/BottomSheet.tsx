import { type ReactNode, useEffect, useId } from "react";

interface Props {
  readonly aberto: boolean;
  readonly titulo: string;
  /** Ícone ao lado do título, na faixa do cabeçalho. */
  readonly icone?: ReactNode;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
}

/** Folha que sobe da base da tela, sobre o mapa. Base de todos os painéis do jogo. */
export function BottomSheet({ aberto, titulo, icone, aoFechar, children }: Props) {
  const idDoTitulo = useId();

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="folha-fundo">
      <button type="button" className="folha-veu" aria-label="Fechar painel" onClick={aoFechar} />
      <section className="folha" role="dialog" aria-modal="true" aria-labelledby={idDoTitulo}>
        <header className="folha-cabecalho">
          <h2 id={idDoTitulo} className="folha-faixa">
            {icone}
            {titulo}
          </h2>
          <button type="button" className="folha-fechar" aria-label="Fechar" onClick={aoFechar}>
            ×
          </button>
        </header>
        <div className="folha-conteudo">{children}</div>
      </section>
    </div>
  );
}
