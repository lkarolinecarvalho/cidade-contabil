import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { conteudo } from "../state/store";
import { Abertura, QUADROS } from "./Abertura";
import { BottomSheet } from "./BottomSheet";
import { Conversa, type Fala } from "./Conversa";
import { CartaoDaProposta, FluxoDaMissao, LINHAS_DA_NOTA_ABERTA } from "./FluxoDaMissao";
import { Hud } from "./Hud";
import { EstudoDoTema } from "./Tema";

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

describe("Abertura", () => {
  const abertura = (inicio: number | null) =>
    renderToStaticMarkup(<Abertura aoTerminar={() => {}} inicio={inicio} />);

  it("começa pela tela de título, sem a história", () => {
    const html = abertura(null);
    expect(html).toContain("Contábil");
    expect(html).toContain("Começar");
    expect(html).not.toContain("Pular");
  });

  it("conta a história um quadro por vez, sempre com a opção de pular", () => {
    expect(QUADROS.length).toBeGreaterThanOrEqual(4);
    const html = abertura(0);
    expect(html).toContain(QUADROS[0]?.texto ?? "");
    expect(html).not.toContain(QUADROS[1]?.texto ?? "");
    expect(html).toContain("Pular");
    expect(html).toContain("Continuar");
    expect(html).toContain(`aria-label="Quadro 1 de ${QUADROS.length}"`);
    for (const quadro of QUADROS) expect(quadro.texto.length).toBeLessThanOrEqual(100);
  });

  it("no último quadro, o botão abre a cidade", () => {
    const html = abertura(QUADROS.length - 1);
    expect(html).toContain("Abrir a cidade");
    expect(html).toContain("Voltar");
  });
});

describe("EstudoDoTema", () => {
  const tema = {
    id: "t",
    titulo: "Um tema",
    resumo: "Resumo.",
    pontos: ["Primeiro ponto.", "Segundo ponto."],
    exemplo: "Um exemplo da casa.",
    perguntas: [{ enunciado: "Uma pergunta.", gabarito: "C" as const, explicacao: "Porque sim." }],
  };
  const estudo = (inicio: number) =>
    renderToStaticMarkup(
      <EstudoDoTema
        tema={tema}
        sobretitulo="Aula"
        rotuloDoFim="Ir para a missão"
        aoConcluir={() => {}}
        inicio={inicio}
      />,
    );

  it("mostra um ponto por vez, depois o exemplo e por fim a pergunta", () => {
    expect(estudo(0)).toContain("Primeiro ponto.");
    expect(estudo(0)).not.toContain("Segundo ponto.");
    expect(estudo(0)).toContain("Ponto 1 de 2");
    expect(estudo(2)).toContain("Um exemplo da casa.");
    const pergunta = estudo(3);
    expect(pergunta).toContain("Uma pergunta.");
    expect(pergunta).toContain("Certo");
    // Enquanto não responde, não há botão de continuar.
    expect(pergunta).not.toContain("Concluir");
    expect(estudo(0)).toContain('aria-label="Passo 1 de 4"');
  });

  it("o quadro aparece junto do exemplo, com os dois lados", () => {
    const patrimonio = conteudo.teoria.find((t) => t.id === "o-patrimonio");
    if (!patrimonio) throw new Error("tema ausente");
    const noExemplo = renderToStaticMarkup(
      <EstudoDoTema
        tema={patrimonio}
        rotuloDoFim="Fim"
        aoConcluir={() => {}}
        inicio={patrimonio.pontos.length}
      />,
    );
    expect(noExemplo).toContain("tema-quadro");
    expect(noExemplo).toContain("Ativo<small>o que a empresa tem</small>");
    expect(noExemplo).toContain("Patrimônio Líquido<small>a parte dos sócios</small>");
    const noPonto = renderToStaticMarkup(
      <EstudoDoTema tema={patrimonio} rotuloDoFim="Fim" aoConcluir={() => {}} />,
    );
    expect(noPonto).not.toContain("tema-quadro");
  });

  it("no fim, mostra o resultado e o botão que leva adiante", () => {
    const html = estudo(4);
    expect(html).toContain("Tema concluído!");
    expect(html).toContain("Ir para a missão");
  });
});

describe("FluxoDaMissao numa conversa com a contadora", () => {
  it("começa pela apresentação da Marta, sem proposta, efeito nem lançamento", () => {
    const [conversa] = conteudo.missoes;
    if (!conversa) throw new Error("campanha vazia");
    const html = renderToStaticMarkup(<FluxoDaMissao missao={conversa} />);
    expect(html).toContain("Começando do zero");
    expect(html).toContain("Olá! Eu sou a Marta");
    expect(html).not.toContain("Aceitar a proposta");
    expect(html).not.toContain("Lançamento");
    expect(html).not.toContain("Efeito");
  });
});

describe("CartaoDaProposta", () => {
  const nota = (linhas: number) => ({
    titulo: "Nota fiscal",
    linhas: Array.from({ length: linhas }, (_, i) => `Linha ${i + 1}`),
  });

  it("na etapa do lançamento, a nota longa começa recolhida e pode ser aberta", () => {
    const html = renderToStaticMarkup(
      <CartaoDaProposta proposta={nota(LINHAS_DA_NOTA_ABERTA + 1)} recolhivel />,
    );
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("ver a nota");
    // As linhas continuam no cartão: abrir é só um toque.
    expect(html).toContain("Linha 5");
  });

  it("a nota curta e a nota da conversa aparecem inteiras", () => {
    const curta = renderToStaticMarkup(
      <CartaoDaProposta proposta={nota(LINHAS_DA_NOTA_ABERTA)} recolhivel />,
    );
    const naConversa = renderToStaticMarkup(<CartaoDaProposta proposta={nota(10)} />);
    for (const html of [curta, naConversa]) {
      expect(html).not.toContain("<details");
      expect(html).toContain("Linha 1");
    }
  });
});
