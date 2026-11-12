import { describe, expect, it } from "vitest";
import {
  type ConteudoBruto,
  carregarConteudo,
  carregarConteudoDoJogo,
  dadosBrutos,
  ErroDeConteudo,
  ordenarMissoes,
} from "./index";

type Registro = Record<string, unknown>;

/** Cópia dos dados reais com uma alteração, para provar que a validação pega o erro. */
function alterar(mudanca: (dados: Record<keyof ConteudoBruto, Registro[]>) => void): ConteudoBruto {
  const copia = JSON.parse(JSON.stringify(dadosBrutos)) as Record<keyof ConteudoBruto, Registro[]>;
  mudanca(copia);
  return copia;
}

function problemasDe(bruto: ConteudoBruto): readonly string[] {
  try {
    carregarConteudo(bruto);
  } catch (erro) {
    if (erro instanceof ErroDeConteudo) return erro.problemas;
    throw erro;
  }
  return [];
}

const missao = (dados: Record<keyof ConteudoBruto, Registro[]>, id: string): Registro => {
  const encontrada = dados.missoes.find((m) => m.id === id);
  if (!encontrada) throw new Error(`Missão não encontrada: ${id}`);
  return encontrada;
};

describe("conteúdo do jogo", () => {
  const conteudo = carregarConteudoDoJogo();

  it("todo o conteúdo valida", () => {
    expect(problemasDe(dadosBrutos)).toEqual([]);
  });

  it("tem os 6 estabelecimentos do MVP (ADR-0008)", () => {
    expect(conteudo.estabelecimentos.map((e) => e.id).sort()).toEqual([
      "banco",
      "escritorio-contabil",
      "fornecedor",
      "imobiliaria",
      "minha-loja",
      "posto-fiscal",
    ]);
  });

  it("tem missões para os capítulos 1 a 6, em ordem de jogo, com nível que nunca cai", () => {
    const capitulos = conteudo.missoes.map((m) => m.capitulo);
    expect([...new Set(capitulos)]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(capitulos).toEqual([...capitulos].sort());
    const niveis = conteudo.missoes.map((m) => m.nivel);
    expect(niveis).toEqual([...niveis].sort());
    expect([...new Set(niveis)]).toEqual([1, 2, 3, 4, 5]);
  });

  it("toda missão tem no máximo três falas curtas e um cartão com os dados da operação", () => {
    for (const m of conteudo.missoes) {
      expect(m.dialogo.length, m.id).toBeLessThanOrEqual(3);
      for (const fala of m.dialogo) expect(fala.texto.length, m.id).toBeLessThanOrEqual(140);
      expect(m.proposta.linhas.length, m.id).toBeGreaterThan(0);
    }
  });

  it("toda nota citada numa devolução ou abatimento foi emitida numa missão anterior", () => {
    const emitidas = new Set<string>();
    for (const m of conteudo.missoes) {
      for (const operacao of m.operacoes) {
        if ((operacao.tipo === "compra" || operacao.tipo === "venda") && operacao.nota) {
          emitidas.add(operacao.nota);
        }
        if (
          operacao.tipo === "devolucao_compra" ||
          operacao.tipo === "abatimento_compra" ||
          operacao.tipo === "devolucao_venda"
        ) {
          expect(emitidas.has(operacao.nota), `${m.id}: nota ${operacao.nota}`).toBe(true);
        }
      }
    }
  });

  it("todo capítulo tem título e missões; todo conceito tem uma definição curta", () => {
    expect(conteudo.capitulos.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const capitulo of conteudo.capitulos) {
      expect(
        conteudo.missoes.some((m) => m.capitulo === capitulo.numero),
        capitulo.titulo,
      ).toBe(true);
    }
    for (const conceito of conteudo.conceitos) {
      expect(conceito.definicao.length, conceito.id).toBeGreaterThan(30);
      expect(conceito.definicao.length, conceito.id).toBeLessThanOrEqual(170);
    }
  });

  it("a teoria tem temas curtos, com exemplo e perguntas de gabaritos misturados", () => {
    expect(conteudo.teoria.length).toBeGreaterThanOrEqual(9);
    for (const tema of conteudo.teoria) {
      for (const ponto of tema.pontos) expect(ponto.length, tema.id).toBeLessThanOrEqual(170);
      expect(tema.exemplo.length, tema.id).toBeLessThanOrEqual(240);
      expect(new Set(tema.perguntas.map((p) => p.gabarito)).size, tema.id).toBe(2);
    }
  });

  it("toda missão está num estabelecimento onde o NPC atende", () => {
    const npcs = new Map(conteudo.npcs.map((n) => [n.id, n]));
    for (const m of conteudo.missoes) {
      expect(npcs.get(m.npc)?.estabelecimento, m.id).toBe(m.estabelecimento);
    }
  });

  it("tem cerca de 50 afirmativas ou mais, com pelo menos 3 por conceito e gabaritos misturados", () => {
    expect(conteudo.afirmativas.length).toBeGreaterThanOrEqual(50);
    for (const conceito of conteudo.conceitos) {
      const doConceito = conteudo.afirmativas.filter((a) => a.conceitoId === conceito.id);
      expect(doConceito.length, conceito.id).toBeGreaterThanOrEqual(3);
      expect(new Set(doConceito.map((a) => a.gabarito)).size, conceito.id).toBe(2);
    }
  });

  it("não repete enunciados", () => {
    const enunciados = conteudo.afirmativas.map((a) => a.enunciado);
    expect(new Set(enunciados).size).toBe(enunciados.length);
  });
});

describe("conteúdo inválido é recusado", () => {
  it("formato: campo obrigatório faltando", () => {
    const problemas = problemasDe(
      alterar((d) => {
        delete d.afirmativas[0]?.explicacao;
      }),
    );
    expect(problemas.join("\n")).toMatch(/afirmativa .*explicacao/);
  });

  it("formato: campo desconhecido", () => {
    const problemas = problemasDe(
      alterar((d) => {
        missao(d, "m004-compra-avista").lancamento = [];
      }),
    );
    expect(problemas.join("\n")).toMatch(/missão m004-compra-avista/);
  });

  it("formato: dinheiro que não é centavo inteiro", () => {
    const problemas = problemasDe(
      alterar((d) => {
        missao(d, "m006-energia").operacoes = [
          { tipo: "despesa", natureza: "energia_eletrica", valorCentavos: 1000.5, meio: "bancos" },
        ];
      }),
    );
    expect(problemas.join("\n")).toMatch(/missão m006-energia/);
  });

  it("formato: operação que o motor não conhece", () => {
    const problemas = problemasDe(
      alterar((d) => {
        missao(d, "m006-energia").operacoes = [{ tipo: "saque", valorCentavos: 100 }];
      }),
    );
    expect(problemas.join("\n")).toMatch(/missão m006-energia/);
  });

  it("formato: nota que repete o mesmo produto", () => {
    const problemas = problemasDe(
      alterar((d) => {
        const operacoes = missao(d, "m004-compra-avista").operacoes as Registro[];
        const itens = operacoes[0]?.itens as Registro[];
        itens.push({ ...itens[0] });
      }),
    );
    expect(problemas.join("\n")).toMatch(/não pode repetir o mesmo produto/);
  });

  it("regra inexistente em docs/regras-contabeis.md", () => {
    const problemas = problemasDe(
      alterar((d) => {
        if (d.afirmativas[0]) d.afirmativas[0].regras = ["R-XYZ-99"];
      }),
    );
    expect(problemas.join("\n")).toMatch(/afirmativa .*regras/);
  });

  it("conceito com menos de 3 afirmativas", () => {
    const problemas = problemasDe(
      alterar((d) => {
        const indice = d.afirmativas.findIndex((a) => a.conceitoId === "cmv");
        d.afirmativas.splice(indice, 1);
      }),
    );
    expect(problemas).toContain("conceito cmv: tem 2 afirmativa(s); o mínimo é 3");
  });

  it("conceito só com gabaritos iguais", () => {
    const problemas = problemasDe(
      alterar((d) => {
        for (const a of d.afirmativas) if (a.conceitoId === "cmv") a.gabarito = "C";
      }),
    );
    expect(problemas).toContain("conceito cmv: nenhuma afirmativa com gabarito E");
  });

  it("afirmativa de conceito inexistente", () => {
    const problemas = problemasDe(
      alterar((d) => {
        if (d.afirmativas[0]) d.afirmativas[0].conceitoId = "conceito-fantasma";
      }),
    );
    expect(problemas.join("\n")).toMatch(/conceito inexistente "conceito-fantasma"/);
  });

  it("placeholder que o motor não calcula", () => {
    const problemas = problemasDe(
      alterar((d) => {
        if (d.afirmativas[0]) d.afirmativas[0].enunciado = "O lucro foi de R$ {{lucroInventado}}.";
      }),
    );
    expect(problemas.join("\n")).toMatch(/placeholder desconhecido "\{\{lucroInventado\}\}"/);
  });

  it("placeholder sem valor de exemplo, e valor de exemplo sem uso", () => {
    const comExemplo = (exemplo: Record<string, number>) =>
      problemasDe(
        alterar((d) => {
          const afirmativa = d.afirmativas.find((a) => a.id === "af-icms-por-dentro-01");
          if (afirmativa) afirmativa.exemplo = exemplo;
        }),
      ).join("\n");
    expect(comExemplo({ totalNota: 300000, icms: 54000 })).toMatch(
      /af-icms-por-dentro-01: falta o valor de exemplo de "\{\{custoEstoque\}\}"/,
    );
    expect(comExemplo({ totalNota: 300000, icms: 54000, custoEstoque: 246000, cmv: 1 })).toMatch(
      /af-icms-por-dentro-01: valor de exemplo sem uso "cmv"/,
    );
  });

  it("missão com estabelecimento, NPC, produto ou conceito inexistente", () => {
    const problemas = problemasDe(
      alterar((d) => {
        const m = missao(d, "m004-compra-avista");
        m.estabelecimento = "shopping";
        m.npc = "ninguem";
        m.conceitos = ["conceito-fantasma"];
        const operacoes = m.operacoes as Registro[];
        (operacoes[0]?.itens as Registro[])[0] = {
          produto: "produto-fantasma",
          quantidade: 1,
          precoUnitarioCentavos: 100,
        };
      }),
    ).join("\n");
    expect(problemas).toMatch(/estabelecimento inexistente "shopping"/);
    expect(problemas).toMatch(/npc inexistente "ninguem"/);
    expect(problemas).toMatch(/conceito inexistente "conceito-fantasma"/);
    expect(problemas).toMatch(/produto inexistente "produto-fantasma"/);
  });

  it("missão cujo conceito não tem afirmativa para o nível dela", () => {
    const problemas = problemasDe(
      alterar((d) => {
        for (const a of d.afirmativas) if (a.conceitoId === "capital-subscrito") a.nivelMin = 2;
      }),
    );
    expect(problemas).toContain(
      'missão m001-constituicao: o conceito "capital-subscrito" não tem afirmativa para o nível 1',
    );
  });

  it("capítulo fora de ordem e missão de capítulo inexistente", () => {
    const problemas = problemasDe(
      alterar((d) => {
        d.capitulos.splice(1, 1);
      }),
    ).join("\n");
    expect(problemas).toMatch(/deveria ser o número 2/);
    expect(problemas).toMatch(/capítulo inexistente 2/);
  });

  it("requisito inexistente e requisitos em ciclo", () => {
    expect(
      problemasDe(
        alterar((d) => {
          missao(d, "m002-compra-imovel").requisitos = ["m999-nao-existe"];
        }),
      ).join("\n"),
    ).toMatch(/requisito inexistente "m999-nao-existe"/);

    const comCiclo = alterar((d) => {
      missao(d, "m001-constituicao").requisitos = ["m001-integralizacao"];
    });
    expect(problemasDe(comCiclo)).toContain("missões: os requisitos formam um ciclo");
    expect(ordenarMissoes(carregarConteudoDoJogo().missoes)).not.toBeNull();
  });

  it("id repetido", () => {
    const problemas = problemasDe(
      alterar((d) => {
        if (d.produtos[0]) d.produtos.push({ ...d.produtos[0] });
      }),
    );
    expect(problemas).toContain("produto pao: id repetido");
  });

  it("participações que não somam 100%, sem o avatar ou com um só sócio (R-CAP-01)", () => {
    const comParticipacoes = (participacoes: Record<string, number>) =>
      problemasDe(
        alterar((d) => {
          const operacoes = missao(d, "m001-constituicao").operacoes as Registro[];
          if (operacoes[0]) operacoes[0].participacoes = participacoes;
        }),
      ).join("\n");
    expect(comParticipacoes({ avatar: 9000, osvaldo: 900 })).toMatch(/somar 10000/);
    expect(comParticipacoes({ avatar: 10000 })).toMatch(/pelo menos dois sócios/);
    expect(comParticipacoes({ osvaldo: 5000, "marta-contadora": 5000 })).toMatch(
      /falta o acionista/,
    );
    expect(comParticipacoes({ avatar: 9000, fantasma: 1000 })).toMatch(/acionista inexistente/);
    expect(comParticipacoes({ avatar: 0.9, osvaldo: 0.1 })).toMatch(/missão m001-constituicao/);
  });
});
