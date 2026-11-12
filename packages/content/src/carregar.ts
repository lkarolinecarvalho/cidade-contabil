import { z } from "zod";
import {
  ACIONISTA_AVATAR,
  type Afirmativa,
  afirmativaSchema,
  type Capitulo,
  type Conceito,
  capituloSchema,
  conceitoSchema,
  type Estabelecimento,
  estabelecimentoSchema,
  type Missao,
  missaoSchema,
  type Npc,
  npcSchema,
  PLACEHOLDERS,
  type Produto,
  produtoSchema,
} from "./schemas";

/** Dados como vêm dos arquivos JSON, ainda sem validação. */
export interface ConteudoBruto {
  readonly estabelecimentos: unknown;
  readonly npcs: unknown;
  readonly produtos: unknown;
  readonly conceitos: unknown;
  readonly capitulos: unknown;
  readonly missoes: unknown;
  readonly afirmativas: unknown;
}

export interface Conteudo {
  readonly estabelecimentos: readonly Estabelecimento[];
  readonly npcs: readonly Npc[];
  readonly produtos: readonly Produto[];
  readonly conceitos: readonly Conceito[];
  /** Capítulos da campanha, em ordem. */
  readonly capitulos: readonly Capitulo[];
  /** Em ordem de jogo: toda missão vem depois dos seus requisitos. */
  readonly missoes: readonly Missao[];
  readonly afirmativas: readonly Afirmativa[];
}

/** Conteúdo inválido. `problemas` lista tudo o que precisa ser corrigido nos dados. */
export class ErroDeConteudo extends Error {
  readonly problemas: readonly string[];

  constructor(problemas: readonly string[]) {
    super(`Conteúdo inválido:\n- ${problemas.join("\n- ")}`);
    this.name = "ErroDeConteudo";
    this.problemas = problemas;
  }
}

/** Mínimo de afirmativas por conceito (docs/fluxo-afirmativas.md, seção 6). */
export const MINIMO_DE_AFIRMATIVAS_POR_CONCEITO = 3;

function validarLista<T>(
  nome: string,
  schema: z.ZodType<T>,
  dados: unknown,
  problemas: string[],
): T[] {
  const resultado = z.array(schema).safeParse(dados);
  if (resultado.success) return resultado.data;
  for (const problema of resultado.error.issues) {
    const [indice, ...caminho] = problema.path;
    const item =
      Array.isArray(dados) && typeof indice === "number"
        ? ((dados[indice] as { id?: unknown } | undefined)?.id ?? `#${indice}`)
        : "";
    problemas.push(
      `${nome} ${String(item)}${caminho.length > 0 ? ` (${caminho.join(".")})` : ""}: ${problema.message}`,
    );
  }
  return [];
}

/** Nomes dos placeholders `{{nome}}` usados no enunciado e na explicação, sem repetição. */
export function placeholdersDe(afirmativa: Pick<Afirmativa, "enunciado" | "explicacao">): string[] {
  const texto = `${afirmativa.enunciado} ${afirmativa.explicacao}`;
  return [...new Set([...texto.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1] ?? ""))];
}

function idsRepetidos(itens: readonly { id: string }[]): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  for (const { id } of itens) {
    if (vistos.has(id)) repetidos.add(id);
    vistos.add(id);
  }
  return [...repetidos];
}

/**
 * Ordena as missões de modo que toda missão venha depois dos seus requisitos,
 * preservando a ordem original entre as que já podem ser jogadas.
 * Devolve `null` quando `requisitos` forma um ciclo.
 */
export function ordenarMissoes(missoes: readonly Missao[]): Missao[] | null {
  const ordenadas: Missao[] = [];
  const concluidas = new Set<string>();
  let pendentes = [...missoes];
  while (pendentes.length > 0) {
    const liberadas = pendentes.filter((m) => m.requisitos.every((r) => concluidas.has(r)));
    const proxima = liberadas[0];
    if (!proxima) return null;
    ordenadas.push(proxima);
    concluidas.add(proxima.id);
    pendentes = pendentes.filter((m) => m !== proxima);
  }
  return ordenadas;
}

/**
 * Valida o conteúdo: formato (schemas zod) e as regras de
 * docs/modelo-de-conteudo.md. Lança `ErroDeConteudo` com todos os problemas.
 */
export function carregarConteudo(bruto: ConteudoBruto): Conteudo {
  const problemas: string[] = [];
  const estabelecimentos = validarLista(
    "estabelecimento",
    estabelecimentoSchema,
    bruto.estabelecimentos,
    problemas,
  );
  const npcs = validarLista("npc", npcSchema, bruto.npcs, problemas);
  const produtos = validarLista("produto", produtoSchema, bruto.produtos, problemas);
  const conceitos = validarLista("conceito", conceitoSchema, bruto.conceitos, problemas);
  const capitulos = validarLista("capítulo", capituloSchema, bruto.capitulos, problemas);
  const missoes = validarLista("missão", missaoSchema, bruto.missoes, problemas);
  const afirmativas = validarLista("afirmativa", afirmativaSchema, bruto.afirmativas, problemas);
  // As regras cruzadas só fazem sentido com o formato certo.
  if (problemas.length > 0) throw new ErroDeConteudo(problemas);

  for (const [nome, itens] of [
    ["estabelecimento", estabelecimentos],
    ["npc", npcs],
    ["produto", produtos],
    ["conceito", conceitos],
    ["missão", missoes],
    ["afirmativa", afirmativas],
  ] as const) {
    for (const repetido of idsRepetidos(itens)) problemas.push(`${nome} ${repetido}: id repetido`);
  }

  const idsDe = (itens: readonly { id: string }[]) => new Set(itens.map((item) => item.id));
  const idsDeEstabelecimentos = idsDe(estabelecimentos);
  const idsDeNpcs = idsDe(npcs);
  const idsDeProdutos = idsDe(produtos);
  const idsDeConceitos = idsDe(conceitos);
  const idsDeMissoes = idsDe(missoes);

  for (const npc of npcs) {
    if (npc.estabelecimento && !idsDeEstabelecimentos.has(npc.estabelecimento)) {
      problemas.push(`npc ${npc.id}: estabelecimento inexistente "${npc.estabelecimento}"`);
    }
  }

  // Afirmativas: conceito existente e placeholders que o motor sabe calcular.
  for (const afirmativa of afirmativas) {
    if (!idsDeConceitos.has(afirmativa.conceitoId)) {
      problemas.push(
        `afirmativa ${afirmativa.id}: conceito inexistente "${afirmativa.conceitoId}"`,
      );
    }
    const usados = placeholdersDe(afirmativa);
    const exemplo: Record<string, number> = afirmativa.exemplo ?? {};
    for (const nome of usados) {
      if (!(PLACEHOLDERS as readonly string[]).includes(nome)) {
        problemas.push(`afirmativa ${afirmativa.id}: placeholder desconhecido "{{${nome}}}"`);
      } else if (!(nome in exemplo)) {
        // Sem operação por trás (ex.: na Revisão), o texto usa o valor de exemplo.
        problemas.push(`afirmativa ${afirmativa.id}: falta o valor de exemplo de "{{${nome}}}"`);
      }
    }
    for (const nome of Object.keys(exemplo)) {
      if (!usados.includes(nome)) {
        problemas.push(`afirmativa ${afirmativa.id}: valor de exemplo sem uso "${nome}"`);
      }
    }
  }

  // Todo conceito tem pelo menos 3 afirmativas, com gabaritos C e E misturados.
  for (const conceito of conceitos) {
    const doConceito = afirmativas.filter((a) => a.conceitoId === conceito.id);
    if (doConceito.length < MINIMO_DE_AFIRMATIVAS_POR_CONCEITO) {
      problemas.push(
        `conceito ${conceito.id}: tem ${doConceito.length} afirmativa(s); o mínimo é ${MINIMO_DE_AFIRMATIVAS_POR_CONCEITO}`,
      );
    }
    for (const gabarito of ["C", "E"] as const) {
      if (doConceito.length > 0 && !doConceito.some((a) => a.gabarito === gabarito)) {
        problemas.push(`conceito ${conceito.id}: nenhuma afirmativa com gabarito ${gabarito}`);
      }
    }
  }

  // Capítulos: numerados de 1 em diante, sem pular nem repetir.
  capitulos.forEach((capitulo, indice) => {
    if (capitulo.numero !== indice + 1) {
      problemas.push(`capítulo "${capitulo.titulo}": deveria ser o número ${indice + 1}`);
    }
  });

  // Missões: referências existentes.
  for (const missao of missoes) {
    if (missao.capitulo !== undefined && !capitulos.some((c) => c.numero === missao.capitulo)) {
      problemas.push(`missão ${missao.id}: capítulo inexistente ${missao.capitulo}`);
    }
    if (!idsDeEstabelecimentos.has(missao.estabelecimento)) {
      problemas.push(
        `missão ${missao.id}: estabelecimento inexistente "${missao.estabelecimento}"`,
      );
    }
    if (!idsDeNpcs.has(missao.npc)) {
      problemas.push(`missão ${missao.id}: npc inexistente "${missao.npc}"`);
    }
    for (const requisito of missao.requisitos) {
      if (!idsDeMissoes.has(requisito)) {
        problemas.push(`missão ${missao.id}: requisito inexistente "${requisito}"`);
      }
    }
    for (const conceito of missao.conceitos) {
      if (!idsDeConceitos.has(conceito)) {
        problemas.push(`missão ${missao.id}: conceito inexistente "${conceito}"`);
        continue;
      }
      // Sem isso, a operação nunca teria afirmativa para o jogador daquele nível.
      const disponivel = afirmativas.some(
        (a) => a.conceitoId === conceito && a.nivelMin <= missao.nivel,
      );
      if (!disponivel) {
        problemas.push(
          `missão ${missao.id}: o conceito "${conceito}" não tem afirmativa para o nível ${missao.nivel}`,
        );
      }
    }
    for (const operacao of missao.operacoes) {
      // Todo produto citado numa operação existe no catálogo.
      const citados =
        "itens" in operacao && operacao.tipo !== "compra_imobilizado"
          ? operacao.itens.map((item) => item.produto)
          : "produto" in operacao
            ? [operacao.produto]
            : [];
      for (const produto of citados) {
        if (!idsDeProdutos.has(produto)) {
          problemas.push(`missão ${missao.id}: produto inexistente "${produto}"`);
        }
      }
      if (operacao.tipo === "subscricao") {
        for (const acionista of Object.keys(operacao.participacoes)) {
          if (acionista !== ACIONISTA_AVATAR && !idsDeNpcs.has(acionista)) {
            problemas.push(`missão ${missao.id}: acionista inexistente "${acionista}"`);
          }
        }
      }
    }
  }

  // `requisitos` não forma ciclo.
  const requisitosExistem = missoes.every((m) => m.requisitos.every((r) => idsDeMissoes.has(r)));
  const ordenadas = requisitosExistem ? ordenarMissoes(missoes) : missoes;
  if (!ordenadas) problemas.push("missões: os requisitos formam um ciclo");

  if (problemas.length > 0 || !ordenadas) throw new ErroDeConteudo(problemas);
  return {
    estabelecimentos,
    npcs,
    produtos,
    conceitos,
    capitulos,
    missoes: ordenadas,
    afirmativas,
  };
}
