import { execSync } from "node:child_process";
import path from "node:path";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://ll:ll@localhost:5432/locallegends_test";

// Database tests run against a separate PostgreSQL database (never the dev one).
// Migrations are applied here; each test file clears the tables it uses.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
    stdio: "ignore",
  });
}
