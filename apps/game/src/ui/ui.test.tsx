import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BottomSheet } from "./BottomSheet";
import { Conversa, type Fala } from "./Conversa";
import { Hud } from "./Hud";

describe("Hud", () => {
  const hud = (abertoDeInicio: boolean) =>
    renderToStaticMarkup(
      <Hud
        empresa="Mercado Vila Nova"
        nivel={2}
        progresso={0.5}
        carteiraCentavos={1_000_000}
        caixaCentavos={50_000}
        bancosCentavos={6_000_000}
        pontos={410}
        data={{ ano: 1, mes: 3, dia: 12 }}
        abertoDeInicio={abertoDeInicio}
        aoVerBalanco={() => {}}
        aoAbrirConfiguracoes={() => {}}
      />,
    );

  it("fechado, mostra só a barra: o dinheiro da empresa (Caixa + Bancos), o nível e a data", () => {
    const html = hud(false);
    expect(html).toContain("R$ 60.500,00");
    expect(html).toContain("D12 · M3");
    expect(html).toContain("Dia 12 do mês 3");
    expect(html).toContain('title="Nível 2"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Configurações"');
    // A carteira do avatar não se mistura com o dinheiro da empresa na barra.
    expect(html).not.toContain("Sua carteira");
    expect(html).not.toContain("Ver Balanço");
  });

  it("aberto, separa a carteira pessoal do Caixa e dos Bancos da empresa", () => {
    const html = hud(true);
    expect(html).toContain("Sua carteira");
    expect(html).toContain("R$ 10.000,00");
    expect(html).toContain("Fora da contabilidade");
    expect(html).toContain("<dt>Caixa</dt><dd>R$ 500,00</dd>");
    expect(html).toContain("<dt>Bancos</dt><dd>R$ 60.000,00</dd>");
  });

  it("aberto, mostra a empresa, o nível, o avanço, os pontos e o botão do Balanço", () => {
    const html = hud(true);
    expect(html).toContain("Mercado Vila Nova");
    expect(html).toContain("Nível 2");
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain("50%");
    expect(html).toContain("410 pts");
    expect(html).toContain("Ver Balanço");
  });
});

describe("Conversa", () => {
  const falas = [
    { fala: "npc", texto: "Primeira fala." },
    { fala: "jogador", texto: "Segunda fala." },
    { fala: "npc", texto: "Terceira fala." },
  ] as const;
  const conversa = (inicio: number, lista: readonly Fala[] = falas) =>
    renderToStaticMarkup(
      <Conversa
        falas={lista}
        npc={{ id: "marta-contadora", nome: "Marta", papel: "Contadora" }}
        acaoFinal="Aceitar a proposta"
        aoConcluir={() => {}}
        inicio={inicio}
      />,
    );

  it("mostra uma fala por vez, com o botão de continuar", () => {
    const html = conversa(0);
    expect(html).toContain("Primeira fala.");
    expect(html).not.toContain("Segunda fala.");
    expect(html).not.toContain("Terceira fala.");
    expect(html).toContain("Continuar");
    expect(html).toContain('aria-label="Fala 1 de 3"');
    // A decisão só aparece na última fala.
    expect(html).not.toContain("Aceitar a proposta");
    expect(html).not.toContain("Voltar");
  });

  it("a fala do jogador aparece com o retrato dele", () => {
    const html = conversa(1);
    expect(html).toContain("Segunda fala.");
    expect(html).toContain("conversa-do-jogador");
    expect(html).toContain('alt="Você"');
    expect(html).toContain("Voltar");
  });

  it("na última fala, troca o continuar pela decisão", () => {
    const html = conversa(2);
    expect(html).toContain("Terceira fala.");
    expect(html).toContain("Aceitar a proposta");
    expect(html).not.toContain("Continuar");
    expect(html).toContain('aria-label="Fala 3 de 3"');
  });

  it("com uma fala só, já mostra a decisão, sem o andamento", () => {
    const html = conversa(0, [falas[0]]);
    expect(html).toContain("Aceitar a proposta");
    expect(html).not.toContain('aria-label="Fala');
  });
});

describe("BottomSheet", () => {
  const folha = (aberto: boolean) =>
    renderToStaticMarkup(
      <BottomSheet aberto={aberto} titulo="Missões" aoFechar={() => {}}>
        <p>conteúdo do painel</p>
      </BottomSheet>,
    );

  it("centralizado, vira uma caixa no meio da tela", () => {
    const html = renderToStaticMarkup(
      <BottomSheet aberto centralizado titulo="Banco" aoFechar={() => {}}>
        <p>conversa</p>
      </BottomSheet>,
    );
    expect(html).toContain("folha-no-centro");
    expect(folha(true)).not.toContain("folha-no-centro");
  });

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
