import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: every module that installs a runner into `dispatch.ts` is actually loaded.
 *
 * `runAction.ts` and `effect.ts` register themselves with `installActionRunner` /
 * `installEffectRunner` at load time, and the handlers call the runners back through
 * `dispatch.ts` instead of importing them — that is what keeps the module graph acyclic.
 *
 * The trap: nothing in the graph imports `runAction.ts`. Its install only runs because
 * `interpreter.ts` names it in a side-effect import. Drop that line and everything still
 * type-checks, while every nested action throws "dispatch not installed" at run time. If this
 * test fails, add the missing `import "./interpreter/<module>.js";` to interpreter.ts — do not
 * delete the assertion.
 */

const INTERPRETER_DIR = dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = join(INTERPRETER_DIR, "..", "interpreter.ts");

/** Modules that call `install*Runner(...)`, as paths relative to the interpreter directory. */
function installerModules(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".ts") || entry.endsWith(".test.ts") || entry === "dispatch.ts") continue;
      if (/^install(?:Action|Effect)Runner\(/m.test(readFileSync(full, "utf8"))) {
        found.push(full.slice(INTERPRETER_DIR.length + 1).replaceAll("\\", "/"));
      }
    }
  };
  walk(INTERPRETER_DIR);
  return found.sort();
}

describe("interpreter dispatch wiring", () => {
  const installers = installerModules();

  it("finds the modules it claims to check", () => {
    expect(installers).toEqual(["actions/runAction.ts", "effect.ts"]);
  });

  it("interpreter.ts loads every installer module", () => {
    const entry = readFileSync(ENTRY_POINT, "utf8");
    const unloaded = installers.filter(
      (module) => !entry.includes(`./interpreter/${module.replace(/\.ts$/, ".js")}`),
    );
    expect(unloaded).toEqual([]);
  });
});
