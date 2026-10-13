// PostToolUse (Edit|Write): roda o ESLint com --fix só no arquivo editado e
// devolve ao Claude apenas os erros que sobraram (incluindo violações de camada, ADR-001).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input?.tool_input?.file_path;

if (!file || !/\.(ts|tsx|js|jsx|mjs|mts)$/.test(file) || /[\\/](node_modules|\.next)[\\/]/.test(file)) {
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "eslint", "--fix", file], {
  cwd: input.cwd ?? process.cwd(),
  encoding: "utf8",
  shell: process.platform === "win32", // pnpm é um .cmd no Windows
  timeout: 60_000,
});

if (result.status === 0 || result.status === null) {
  process.exit(0);
}

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().slice(0, 3000);
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `ESLint encontrou problemas em ${file}:\n${output}`,
    },
  }),
);
