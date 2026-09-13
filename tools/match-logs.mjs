import { createReadStream, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [id, directory = process.env.AEGIS_LOG_DIR ?? fileURLToPath(new URL("../apps/api/logs/", import.meta.url))] =
  process.argv.slice(2);
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? "")) {
  console.error("Usage: pnpm logs:match <match UUID> [log directory]");
  process.exit(1);
}
let found = false;
for (const name of readdirSync(directory)
  .filter((entry) => /^api-.*\.jsonl$/.test(entry))
  .sort()) {
  const lines = createInterface({ input: createReadStream(join(directory, name)), crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      if (JSON.parse(line).matchId === id) {
        process.stdout.write(line + "\n");
        found = true;
      }
    } catch {
      /* An interrupted final write is ignored. */
    }
  }
}
if (!found) {
  console.error("No retained logs found for this match ID.");
  process.exitCode = 2;
}
