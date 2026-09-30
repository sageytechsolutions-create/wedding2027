import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "test/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    env: { DATABASE_URL: `file:${path.resolve(__dirname, "prisma/test.db")}` },
    // Database tests share one SQLite file.
    fileParallelism: false,
  },
});
