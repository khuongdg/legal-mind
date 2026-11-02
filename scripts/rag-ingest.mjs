#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pythonCandidates = [
  process.env.RAG_PYTHON,
  path.join(repositoryRoot, ".venv", "bin", "python"),
  "python3",
].filter(Boolean);

function supportsParserDependencies(pythonPath) {
  const result = spawnSync(pythonPath, ["-c", "import yaml, docx, pdfplumber"], {
    cwd: repositoryRoot,
    stdio: "ignore",
  });
  return result.status === 0;
}

const pythonPath = pythonCandidates.find((candidate) => {
  if (candidate.includes(path.sep) && !existsSync(candidate)) return false;
  return supportsParserDependencies(candidate);
});

if (!pythonPath) {
  console.error(
    "Python parser dependencies are missing. Install them with the same interpreter used for ingestion: " +
      "python3 -m pip install -r scripts/requirements.txt. " +
      "Set RAG_PYTHON to that interpreter path if it is not the workspace .venv or python3."
  );
  process.exit(1);
}

if (process.argv.includes("--check")) {
  console.log(`Parser environment ready: ${pythonPath}`);
  process.exit(0);
}

const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const steps = [
  [pythonPath, ["scripts/batch_parse.py"]],
  [packageManager, ["db:migrate"]],
  [packageManager, ["--filter", "@legal-mind/db", "ingest"]],
];

for (const [command, args] of steps) {
  console.log(`\n$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
