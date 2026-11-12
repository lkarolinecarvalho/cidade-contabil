import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Caminhos relativos: o build funciona na raiz de um domínio, numa subpasta (GitHub
  // Pages) e, depois, dentro do app empacotado.
  base: "./",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
