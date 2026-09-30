import { productionConfigProblems } from "./lib/env";

// Runs once when the server starts.
export function register() {
  if (process.env.NODE_ENV !== "production") return;
  const problems = productionConfigProblems();
  if (problems.length) {
    throw new Error(`Local Legends can't start. Fix these settings:\n- ${problems.join("\n- ")}`);
  }
}
