import capitulos from "../data/capitulos.json";
import conceitos from "../data/conceitos.json";
import estabelecimentos from "../data/estabelecimentos.json";
import npcs from "../data/npcs.json";
import produtos from "../data/produtos.json";
import teoria from "../data/teoria.json";
import type { ConteudoBruto } from "./carregar";

// O Vite embute os JSON no pacote: o conteúdo funciona offline, sem I/O em tempo de jogo.
const arquivosDeMissao = import.meta.glob<unknown>("../data/missoes/*.json", {
  eager: true,
  import: "default",
});
const arquivosDeAfirmativas = import.meta.glob<unknown>("../data/afirmativas/*.json", {
  eager: true,
  import: "default",
});

const emOrdem = (arquivos: Record<string, unknown>): unknown[] =>
  Object.keys(arquivos)
    .sort()
    .map((caminho) => arquivos[caminho]);

/** Dados do jogo como estão nos arquivos, antes da validação. */
export const dadosBrutos: ConteudoBruto = {
  estabelecimentos,
  npcs,
  produtos,
  conceitos,
  capitulos,
  teoria,
  // Um arquivo por missão.
  missoes: emOrdem(arquivosDeMissao),
  // Cada arquivo de afirmativas é uma lista.
  afirmativas: emOrdem(arquivosDeAfirmativas).flat(),
};
