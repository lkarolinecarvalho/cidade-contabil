import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomSheet } from "./BottomSheet";
import { Hud } from "./Hud";

describe("Hud", () => {
  const html = renderToStaticMarkup(
    <Hud
      nivel={2}
      carteiraCentavos={1_000_000}
      disponibilidadesCentavos={6_050_000}
      pontos={410}
      data={{ ano: 1, mes: 3, dia: 12 }}
    />,
  );

  it("mostra a carteira pessoal e o caixa da empresa separados, com rótulos diferentes", () => {
    expect(html).toContain("Sua carteira");
    expect(html).toContain("R$ 10.000,00");
    expect(html).toContain("Caixa da empresa");
    expect(html).toContain("R$ 60.500,00");
  });

  it("mostra nível, pontos e dia/mês", () => {
    expect(html).toContain("Nível 2");
    expect(html).toContain("410 pts");
    expect(html).toContain("Dia 12 · Mês 3");
  });
});

describe("BottomSheet", () => {
  const folha = (aberto: boolean) =>
    renderToStaticMarkup(
      <BottomSheet aberto={aberto} titulo="Missões" aoFechar={() => {}}>
        <p>conteúdo do painel</p>
      </BottomSheet>,
    );

  it("fechado, não renderiza nada", () => {
    expect(folha(false)).toBe("");
  });

  it("aberto, é um diálogo com título, conteúdo e botão de fechar", () => {
    const html = folha(true);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Missões");
    expect(html).toContain("conteúdo do painel");
    expect(html).toContain('aria-label="Fechar"');
  });
});
