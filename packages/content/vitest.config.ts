import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // M0: os schemas ainda não existem. Remover no M2, quando todo dado for validado.
    passWithNoTests: true,
  },
});
