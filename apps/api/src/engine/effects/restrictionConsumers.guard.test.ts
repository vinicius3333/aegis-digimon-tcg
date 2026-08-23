import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: every `EnforcedRestriction` has at least one engine site that READS it.
 *
 * `restrict()` used to accept five kinds nothing consumed — `beDeleted`, `beReturned`,
 * `beTrashed`, `dpImmune`, `attackTargetChange`. 41 card modules recorded protection that
 * mutated continuous state and was never looked at: type-safe, green under the whole suite,
 * and completely inert. Splitting the union stops a card from naming an unenforced kind; this
 * stops a kind from quietly losing its consumer afterwards.
 *
 * A consumer is a `hasRestriction(...)` / `isRestricted(...)` / `restrictionCount(...)` read
 * naming the kind, anywhere under `engine/` outside the declaration and the ledger itself. If this fails, either wire the kind up or move it to
 * `DeprecatedRestriction` — do not delete the assertion.
 */

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTEXT_FILE = join(ENGINE_DIR, "effects", "EffectContext.ts");

/** Files that declare or store restrictions rather than act on them. */
const NOT_CONSUMERS = ["effects/EffectContext.ts", "effects/continuous.ts"];

function enforcedKinds(): string[] {
  // Strip line comments first: several union members carry trailing prose containing both
  // semicolons and quoted card text, either of which would derail the union's extent.
  const source = readFileSync(CONTEXT_FILE, "utf8").replace(/\/\/[^\n]*/g, "");
  const block = source.match(/export type EnforcedRestriction =([^;]*);/);
  expect(block, "EnforcedRestriction union not found").not.toBeNull();
  return [...block![1]!.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]!);
}

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
      const relative = full.slice(ENGINE_DIR.length + 1);
      if (NOT_CONSUMERS.includes(relative.replaceAll("\\", "/"))) continue;
      files.push({ path: relative, text: readFileSync(full, "utf8") });
    }
  };
  walk(ENGINE_DIR);
  return files;
}

describe("restriction consumers", () => {
  const sources = engineSources();

  it.each(enforcedKinds())("%s is read by at least one engine site", (kind) => {
    const readers = sources
      .filter(
        ({ text }) =>
          new RegExp(`hasRestriction\\([^)]*"${kind}"`, "s").test(text) ||
          new RegExp(`isRestricted\\([^)]*"${kind}"`, "s").test(text) ||
          // A counted restriction (BT7-055's "trash 1 card from your hand to unsuspend") is read
          // through the tally rather than the boolean.
          new RegExp(`restrictionCount\\([^)]*"${kind}"`, "s").test(text),
      )
      .map(({ path }) => path);

    expect(
      readers,
      `"${kind}" is declared enforced but nothing reads it — wire it up, or move it to DeprecatedRestriction`,
    ).not.toHaveLength(0);
  });

  it("finds every kind it claims to check", () => {
    // Cheap protection against the union regex silently matching nothing.
    expect(enforcedKinds().length).toBeGreaterThan(15);
  });
});
