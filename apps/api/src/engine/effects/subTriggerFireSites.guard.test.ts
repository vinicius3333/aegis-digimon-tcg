import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guard: every `SubTriggerEventName` member has at least one REAL `fireSubTrigger(...)` call
 * site under `engine/` — not merely a declaration in the union, and not merely an entry in
 * `SUBTRIGGER_EVENT_MAP` (a name-lookup table that resolves a compiled-IR trigger STRING onto a
 * `SubTriggerEventName`; a self-mapping entry like `whenDigivolving: "whenDigivolving"` makes a
 * dead name compile cleanly forever without ever dispatching it).
 *
 * This guard exists because that exact failure mode happened twice in one lane: 29 dead names
 * were found, fixed, and proven with remove-confirm-red-restore tests — then a concurrent
 * `git stash`/revert destroyed the fixes' engine-side plumbing (fire sites, gate functions) while
 * leaving some card-side renames and this guard test itself un-recreated, so the regression
 * shipped invisibly. A rebuilt, permanent guard is what would have caught it immediately.
 *
 * A "real fire site" is a literal `fireSubTrigger(` / `fireSubTrigger?.(` / `fireSubTrigger!(`
 * call whose first argument is the event's own string literal, found anywhere under `engine/`
 * OUTSIDE this file and the two files that only DECLARE/CATALOG the name
 * (`EffectContext.ts`'s `SubTriggerEventName` union, `interpreter.ts`'s `SUBTRIGGER_EVENT_MAP`
 * key list) — i.e. it must be a genuine call, not a declaration.
 *
 * `ReplacementEventName` is a SEPARATE dispatch path (`subscribeReplacement` / `consultReplacement`
 * / `replacementsFor`), fired for events like `wouldLeavePlay`/`wouldBeDeleted`/`wouldBePlayed`/
 * `wouldDigivolve`. A plain grep for those name strings would false-positive against THIS guard
 * (they never appear as a `fireSubTrigger(...)` argument, by design) — they are intentionally
 * excluded from the SubTriggerEventName scan below; see the sibling `replacementEventName`
 * coverage assertion, which checks them via their own dispatch call (`consultReplacement`).
 */

const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTEXT_FILE = join(ENGINE_DIR, "effects", "EffectContext.ts");

/** Files that only declare/catalog event names rather than fire them. */
const NOT_FIRE_SITES = new Set(["effects/EffectContext.ts", "effects/subTriggerFireSites.guard.test.ts"]);

/**
 * Names with zero real fire sites that are genuinely delivered another way, or genuinely not
 * yet wired — each entry MUST name the specific missing piece, not "out of scope". Shrink this
 * as each is resolved; never add an entry to silence a failure without doing the same rigor
 * (KB-verify semantics, then wire a real fire site or collapse the card onto a live event).
 */
const ALLOWLIST: Record<string, string> = {};

function subTriggerEventNames(): string[] {
  // Strip `//` line comments before parsing. NEVER add a `/** */` block comment inside the
  // union: the regex below only strips `//` comments, so a block comment containing a quoted
  // word (e.g. a JSDoc example like `"mine"`) gets misparsed as a fake union member — this
  // bit a prior pass on this exact file (see git history / the BT26 engine-gaps plan).
  const source = readFileSync(CONTEXT_FILE, "utf8").replace(/\/\/[^\n]*/g, "");
  const block = source.match(/export type SubTriggerEventName =([^;]*);/);
  expect(block, "SubTriggerEventName union not found").not.toBeNull();
  return [...block![1]!.matchAll(/"([a-zA-Z0-9]+)"/g)].map((m) => m[1]!);
}

function replacementEventNames(): string[] {
  const source = readFileSync(CONTEXT_FILE, "utf8").replace(/\/\/[^\n]*/g, "");
  const block = source.match(/export type ReplacementEventName =([^;]*);/);
  expect(block, "ReplacementEventName union not found").not.toBeNull();
  return [...block![1]!.matchAll(/"([a-zA-Z0-9]+)"/g)].map((m) => m[1]!);
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
      const relative = full.slice(ENGINE_DIR.length + 1).replaceAll("\\", "/");
      if (NOT_FIRE_SITES.has(relative)) continue;
      files.push({ path: relative, text: readFileSync(full, "utf8") });
    }
  };
  walk(ENGINE_DIR);
  return files;
}

/** A genuine `fireSubTrigger(...)` (or `?.`/`!` variant) call naming this exact event string. */
function hasRealFireSite(event: string, sources: { path: string; text: string }[]): boolean {
  const pattern = new RegExp(`fireSubTrigger[!?]?\\.?\\(\\s*"${event}"`);
  return sources.some(({ text }) => pattern.test(text));
}

/**
 * A `consultReplacement`/`replacementsFor` call naming this exact replacement event — OR, for
 * `wouldDigivolve`/`wouldBePlayed`, their specialized cost-reduction dispatch (`costReductionFor`,
 * `wouldBePlayedSelfReducersFor`): these two don't go through the generic replacement-consult
 * path at all — GameEngine reads them directly as pay-time cost reducers — so the generic
 * pattern alone would false-negative on real, live dispatch.
 */
function hasRealReplacementSite(event: string, sources: { path: string; text: string }[]): boolean {
  const generic = new RegExp(`(?:consultReplacement|replacementsFor)\\([^)]*"${event}"`, "s");
  const costReduction = new RegExp(`costReductionFor\\(\\s*"${event}"`);
  const selfReducer = event === "wouldBePlayed" ? /wouldBePlayedSelfReducersFor\(/ : /$^/;
  return sources.some(
    ({ text }) => generic.test(text) || costReduction.test(text) || selfReducer.test(text),
  );
}

describe("SubTriggerEventName fire-site coverage", () => {
  const sources = engineSources();
  const names = subTriggerEventNames();

  it("the union is non-empty (sanity: the parser didn't silently find nothing)", () => {
    expect(names.length).toBeGreaterThan(10);
  });

  it.each(names)("%s has a real fireSubTrigger(...) call site, or a specific allowlist reason", (event) => {
    if (event in ALLOWLIST) {
      // Documented as delivered another way / not yet wired — the reason itself is required,
      // not just the key's presence.
      expect(ALLOWLIST[event]!.length).toBeGreaterThan(0);
      return;
    }
    const fired = hasRealFireSite(event, sources);
    expect(
      fired,
      `"${event}" has no real fireSubTrigger(...) call site under engine/ (outside declarations). ` +
        `Either add the fire site, or add a SPECIFIC reason to ALLOWLIST naming exactly what ` +
        `delivers it instead — never a generic "out of scope".`,
    ).toBe(true);
  });

  it("ALLOWLIST contains no name that actually has a real fire site (shrink it, don't let it drift stale)", () => {
    const stale = Object.keys(ALLOWLIST).filter((event) => hasRealFireSite(event, sources));
    expect(stale, `these allowlisted names now have real fire sites — remove them from ALLOWLIST: ${stale.join(", ")}`).toEqual([]);
  });

  it("a SUBTRIGGER_EVENT_MAP self-mapping entry alone does NOT satisfy this guard (regression probe)", () => {
    // Documents the exact failure mode this guard exists to catch: a map entry that resolves a
    // name onto itself compiles cleanly and reads as "supported" at a glance, but dispatches
    // nothing without a real fireSubTrigger(...) call elsewhere. This probe fabricates that
    // shape for a name that is NOT a real event and asserts our own detector correctly reports
    // it as fire-less, proving the guard doesn't accidentally treat map presence as coverage.
    const fakeMapOnlySource = [
      { path: "fixture.ts", text: 'const SUBTRIGGER_EVENT_MAP = { whenNotARealEvent: "whenNotARealEvent" };' },
    ];
    expect(hasRealFireSite("whenNotARealEvent", fakeMapOnlySource)).toBe(false);
  });
});

describe("ReplacementEventName dispatch coverage (separate path — not fireSubTrigger)", () => {
  const sources = engineSources();
  const names = replacementEventNames();

  it("the union is non-empty", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it.each(names)("%s has a real consultReplacement/replacementsFor call site", (event) => {
    expect(hasRealReplacementSite(event, sources)).toBe(true);
  });

  it("a ReplacementEventName is never mistaken for a fireSubTrigger call (false-positive probe)", () => {
    // wouldLeavePlay is a real, live ReplacementEventName with real consultReplacement sites —
    // but it must NOT appear as a fireSubTrigger(...) call anywhere (that would mean the two
    // dispatch paths got crossed for this name). This is the exact false-positive a plain grep
    // for the string "wouldLeavePlay" would produce if it didn't distinguish the two paths.
    expect(hasRealFireSite("wouldLeavePlay", sources)).toBe(false);
    expect(hasRealReplacementSite("wouldLeavePlay", sources)).toBe(true);
  });
});
