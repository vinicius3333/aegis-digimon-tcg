import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: no engine source inserts into the front of an array.
 *
 * `ArraySchema#unshift` does not survive encoding (@colyseus/schema 3.0.76 never calls
 * `setParent` on the items it inserts), so every front-insertion reached the client as an
 * identity-less blank card with the neighbouring entries reordered or dropped —
 * `state/syncedArrayInsert.test.ts` pins the behaviour. The engine has no plain-array
 * `unshift` worth the ambiguity, so the rule here is flat: `unshift` nowhere under `engine/`,
 * and insertion goes through `insertCard` / `unshiftOnStack` / `linkCard` / `replaceStack`,
 * which rebuild the tail with the appends and deletions that DO encode.
 *
 * `splice` with insert arguments is barred for the same reason — it throws outright when it
 * would insert more than it deletes, so it is never the way around this.
 */

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

function engineSources(): { path: string; text: string }[] {
  const files: { path: string; text: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
      files.push({ path: full.slice(ENGINE_DIR.length + 1), text: readFileSync(full, "utf8") });
    }
  };
  walk(ENGINE_DIR);
  return files;
}

/** Source lines that call a mutator, with comments and string literals stripped. */
function callers(text: string, pattern: RegExp): string[] {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
    .filter((line) => pattern.test(line));
}

describe("synchronized array mutators", () => {
  const sources = engineSources();

  it("never calls unshift", () => {
    const offenders = sources
      .flatMap(({ path, text }) => callers(text, /\.unshift\(/).map((line) => `${path}: ${line.trim()}`))
      .sort();
    expect(offenders).toEqual([]);
  });

  it("never splices values into an array", () => {
    const offenders = sources
      .flatMap(({ path, text }) =>
        // splice(start, deleteCount) is a removal and stays allowed; a third argument inserts.
        callers(text, /\.splice\([^)]*,[^)]*,/).map((line) => `${path}: ${line.trim()}`),
      )
      .sort();
    expect(offenders).toEqual([]);
  });
});
