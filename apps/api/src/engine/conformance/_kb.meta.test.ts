import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript-api";
import { getCitedIds, getNotTestableIds, getObservedFiles, loadRuleIndex } from "./_kb.js";
// Side-effect import: registers the seeded not-testable manifest with `_kb.ts`.
import { NOT_TESTABLE } from "./not-testable.js";

/**
 * Meta-test for the KB conformance suite itself, not for any one chapter. See
 * `README.md` for the full design writeup. Three assertions are always
 * enforceable and always run:
 *
 *   1. every cited id exists in the index
 *   2. every not-testable id exists in the index
 *   3. no id is both cited and not-testable
 *
 * The fourth thing this file does — logging the coverage residual
 * (allIds - cited - notTestable) grouped by chapter — is a REPORT, not an
 * assertion, and it stays that way until flipped (see "Flipping to enforcing"
 * below). It is gated by `assertFullCollection()`, which refuses to compute or
 * print a residual at all unless it has affirmative evidence that every chapter
 * test file in this directory actually ran in this process. See "The
 * vacuous-cite-set hazard" below for why that matters.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF_BASENAME = "_kb.meta.test.ts";

interface DeclaredCitationInventory {
  cited: Set<string>;
  notTestable: Set<string>;
  unresolved: string[];
}

/**
 * Collect literal cite/markNotTestable declarations from source, independently of
 * Vitest's worker scheduling. This is a declaration inventory only: the runtime
 * registry remains the authority that a call actually executed and that its
 * fingerprint was checked. A tiny local-constant resolver covers the normal
 * top-level `const CHUNK = "..."; cite(CHUNK, ...)` shape without pretending to
 * evaluate block-local scopes or arbitrary TypeScript.
 */
function declaredSourceInventory(): DeclaredCitationInventory {
  const cited = new Set<string>();
  const notTestable = new Set<string>();
  const unresolved: string[] = [];
  const files = readdirSync(HERE)
    .filter((name) => name.endsWith(".test.ts") || name === "not-testable.ts")
    .filter((name) => name !== SELF_BASENAME)
    .sort();

  for (const basename of files) {
    const file = `${HERE}/${basename}`;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const constants = new Map<string, string>();
    source.forEachChild((node) => {
      if (!ts.isVariableStatement(node)) return;
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
        if (
          ts.isStringLiteral(declaration.initializer) ||
          ts.isNoSubstitutionTemplateLiteral(declaration.initializer)
        ) {
          constants.set(declaration.name.text, declaration.initializer.text);
        }
      }
    });

    function visit(node: ts.Node): void {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === "cite" || node.expression.text === "markNotTestable")
      ) {
        const first = node.arguments[0];
        const id =
          first === undefined
            ? undefined
            : ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)
              ? first.text
              : ts.isIdentifier(first)
                ? constants.get(first.text)
                : undefined;
        // This intentional negative probe must never become a declared KB obligation.
        if (basename === "kb-citation-drift.test.ts" && id === "missing-review-chunk") return;
        if (id === undefined) {
          unresolved.push(
            `${basename}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}:${node.expression.text}`,
          );
        } else if (node.expression.text === "cite") cited.add(id);
        else notTestable.add(id);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { cited, notTestable, unresolved };
}

const DECLARED = declaredSourceInventory();
for (const { id } of NOT_TESTABLE) DECLARED.notTestable.add(id);

/**
 * The vacuous-cite-set hazard: `citedIds`/`notTestableIds` in `_kb.ts` are plain
 * module-level state. `vitest.config.ts` runs with `isolate: false` under the
 * `forks` pool, so that state is shared across every test FILE that lands in the
 * same worker process — but `forks` still spreads files across multiple worker
 * PROCESSES (the configured `maxWorkers`, capped by the RAM-aware worker budget
 * and `TEST_MAX_WORKERS` override), each with its own memory.
 * A chapter test file that happens to run in a different fork than this one never
 * touches this process's registry. If this file blindly computed
 * `allIds - cited - notTestable` from whatever it happened to observe, a
 * multi-fork run could see an empty (or partial) cited set and report a huge
 * residual — or, worse, after the report is flipped to an enforcing assertion,
 * silently pass a threshold it only cleared because most chapter files were
 * invisible to it. That would be a false green.
 *
 * The guard: every chapter file that calls `cite()`/`markNotTestable()` gets its
 * absolute path recorded in `_kb.ts` (`getObservedFiles()`, derived from the call
 * stack). This function compares that observed set against every `*.test.ts`
 * file that actually exists on disk in this directory (excluding this file). If
 * any expected file is missing from the observed set, full collection is
 * unproven — this process cannot tell the difference between "that file has zero
 * citations" and "that file ran in a different fork and we never saw it" — so
 * the coverage report is skipped, not guessed at.
 *
 * This can under-report (a false "unverifiable" when everything actually did run
 * in this process, e.g. if a chapter file's tests haven't executed yet at the
 * point this test runs) but it can never over-claim coverage, which is the safe
 * direction. Practically: use `pnpm test:conformance` (single fork, see
 * `package.json`) to get a trustworthy report.
 */
function assertFullCollection(): { proven: boolean; expected: string[]; observed: string[] } {
  const expected = readdirSync(HERE)
    .filter((name) => name.endsWith(".test.ts") && name !== SELF_BASENAME)
    .sort();
  const observed = new Set(getObservedFiles());
  const missing = expected.filter((name) => !Array.from(observed).some((file) => file.endsWith(`/${name}`)));
  return { proven: missing.length === 0, expected, observed: Array.from(observed).sort() };
}

describe("KB conformance meta", () => {
  it("every cited id exists in the rules index", () => {
    const index = loadRuleIndex();
    const allIds = new Set(index.chunks.map((c) => c.id));
    for (const id of new Set([...getCitedIds(), ...DECLARED.cited])) {
      expect(allIds.has(id), `cited id "${id}" is not in rules-index.json`).toBe(true);
    }
  });

  it("every not-testable id exists in the rules index", () => {
    const index = loadRuleIndex();
    const allIds = new Set(index.chunks.map((c) => c.id));
    for (const id of new Set([...getNotTestableIds(), ...DECLARED.notTestable])) {
      expect(allIds.has(id), `not-testable id "${id}" is not in rules-index.json`).toBe(true);
    }
  });

  it("no id is both cited and not-testable", () => {
    const cited = new Set([...getCitedIds(), ...DECLARED.cited]);
    const notTestable = new Set([...getNotTestableIds(), ...DECLARED.notTestable]);
    const overlap = [...cited].filter((id) => notTestable.has(id));
    expect(overlap, `ids marked both cited and not-testable: ${overlap.join(", ")}`).toEqual([]);
  });

  it("reports coverage (proxy only — not a pass/fail gate; see README)", () => {
    const { proven, expected, observed } = assertFullCollection();
    if (DECLARED.unresolved.length > 0) {
      console.warn(
        `[kb conformance] source inventory has unresolved declarations (not guessed): ${DECLARED.unresolved.join(", ")}`,
      );
    }
    if (!proven) {
      console.warn(
        `[kb conformance] coverage report SKIPPED: cannot prove every chapter test file ran ` +
          `in this process. Expected files: [${expected.join(", ")}]. Observed (cited from) ` +
          `files: [${observed.join(", ")}]. Run \`pnpm test:conformance\` (single fork) for a ` +
          `trustworthy report.`,
      );
      return;
    }

    const index = loadRuleIndex();
    const cited = new Set(getCitedIds());
    const notTestable = new Set(getNotTestableIds());
    const residual = index.chunks.filter((c) => !cited.has(c.id) && !notTestable.has(c.id));

    const bySource = new Map<string, number>();
    for (const chunk of residual) {
      bySource.set(chunk.source, (bySource.get(chunk.source) ?? 0) + 1);
    }

    console.log(
      `[kb conformance] coverage report: ${index.chunks.length} total chunks, ` +
        `${cited.size} cited, ${notTestable.size} not-testable, ${residual.length} residual ` +
        `(uncited and not marked not-testable).`,
    );
    console.log(`[kb conformance] residual by source: ${JSON.stringify(Object.fromEntries(bySource))}`);

    // REPORTING ONLY today — chapter test files now exist, but citation presence
    // still does not prove every obligation in a chunk. To flip this from a report
    // into an enforcing gate after the classified source coverage is complete, change
    // the line below from a `console.log`-only check to:
    //   expect(residual.length, `${residual.length} KB chunks are neither cited nor
    //   marked not-testable: ${residual.map((c) => c.id).join(", ")}`).toBe(0);
    // Until that line is added, a green run here proves nothing about coverage —
    // only that the ids that ARE cited/not-testable are internally consistent.
    expect(residual.length).toBeGreaterThanOrEqual(0);
  });
});
