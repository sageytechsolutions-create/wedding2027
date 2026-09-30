import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Tests that touch the database use a throwaway SQLite file, never dev.db.
export default function setup() {
  const file = path.resolve(__dirname, "../prisma/test.db");
  rmSync(file, { force: true });
  execSync("npx prisma db push --skip-generate", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${file}` },
    stdio: "ignore",
  });
}
