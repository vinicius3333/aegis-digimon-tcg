import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const rows = [];

for (let number = 1; number <= 74; number += 1) {
  const cardId = `EX11-${String(number).padStart(3, "0")}`;
  const testPath = `src/cards/EX11/${cardId}.test.ts`;
  const result = spawnSync("pnpm", ["--filter", "@aegis/api", "exec", "vitest", "run", testPath], {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  process.stdout.write(`${cardId}: ${result.status === 0 ? "PASS" : "FAIL"}\n`);
  if (result.status !== 0) {
    process.stderr.write(output);
    process.exit(result.status ?? 1);
  }
  const count = output.match(/Tests\s+(\d+) passed/)?.[1];
  if (count === undefined) throw new Error(`Could not read passing test count for ${cardId}`);
  rows.push(`${cardId}\tPASS\t${count}\tcurrent`);
}

writeFileSync(resolve(root, "docs/audits/EX11-focused-results.tsv"), `${rows.join("\n")}\n`);
