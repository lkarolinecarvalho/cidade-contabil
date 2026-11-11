// Tipos mínimos dos recursos do Vite usados nos testes (sem depender de tipos do Node).
declare module "*?raw" {
  const conteudo: string;
  export default conteudo;
}

interface ImportMeta {
  glob(
    padrao: string,
    opcoes: { query: "?raw"; import: "default"; eager: true },
  ): Record<string, string>;
}
