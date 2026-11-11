import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // M0: o motor ainda não existe. Remover no M1, quando cada regra tiver teste.
    passWithNoTests: true,
  },
});
