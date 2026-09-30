import { defineConfig } from "vitest/config";
import path from "node:path";

const testDb = process.env.TEST_DATABASE_URL ?? "postgresql://ll:ll@localhost:5432/locallegends_test";

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
    env: { DATABASE_URL: testDb, DIRECT_URL: testDb },
    // Database tests share one database.
    fileParallelism: false,
  },
});
