import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guardrail for the 11 "gating-blocked" cards (Phase 10, plan 10-01).
 *
 * These 11 cards previously carried compiled blocking markers even though each card had a
 * faithful, A3-proven `.ts` override. Plan 10-01 aligned effects.json to the override (scoped
 * patch-raw-unparsed / surgical edit — never regen-full.sh). This test asserts the post-alignment
 * state: NONE of the 11 carries its blocking marker.
 *
 *   - 9 raw-unparsed + BT23-024 (nested raw in a whenLinked SubTrigger): no "RawUnparsed" token
 *     anywhere in the entry (top-level OR nested) AND an empty `residual`.
 *   - BT11-016 (semantic-stub): no GrantStatic action whose tokens include a SelectionCap-prefixed
 *     token (the continuous SelectionCap cap rule has no engine semantics — a dead store).
 *
 * This test is RED before 10-01 Task 2's alignment and GREEN after it.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EFFECTS_PATH = join(ROOT, "packages/shared/src/effects/effects.json");

const RAW_BLOCKED = [
  "BT25-004",
  "BT25-045",
  "BT25-076",
  "BT7-024",
  "EX10-062",
  "EX10-073",
  "EX11-062",
  "EX6-044",
  "EX9-043",
  "BT23-024",
] as const;

const STUB_BLOCKED = ["BT11-016"] as const;

const ALL_GATING_BLOCKED = [...RAW_BLOCKED, ...STUB_BLOCKED] as const;

/**
 * Allowed residual carry-overs after alignment: a residual is acceptable ONLY when it is an
 * honestly-recorded, separately-owned missing primitive that does NOT re-block the card (the card
 * still has ex.tier=full because the clause is modeled by an executable proxy). The trash-link
 * blocking marker that gated EX10-062 IS resolved; its remaining residual is the app-fuse clause
 * (modeled as DnaDigivolve, owned by plan 08-03).
 */
const ALLOWED_RESIDUAL = new Set(["EX10-062"]);

type CompiledAction = {
  kind?: string;
  tokens?: unknown[];
  actions?: CompiledAction[];
  then?: CompiledAction[];
  options?: CompiledAction[][];
};
type CompiledCard = { effects?: { actions?: CompiledAction[] }[]; residual?: string[] };

const effects = JSON.parse(readFileSync(EFFECTS_PATH, "utf8")) as Record<string, CompiledCard>;

function walkActions(card: CompiledCard): CompiledAction[] {
  const out: CompiledAction[] = [];
  const visit = (act: CompiledAction | undefined) => {
    if (!act || typeof act !== "object") return;
    out.push(act);
    for (const child of act.actions ?? []) visit(child);
    for (const child of act.then ?? []) visit(child);
    for (const group of act.options ?? []) for (const child of group) visit(child);
  };
  for (const eff of card.effects ?? []) for (const act of eff.actions ?? []) visit(act);
  return out;
}

describe("Phase 10 gating-blocked cards: no blocking marker post-alignment", () => {
  it("includes all 11 ids and they all exist in effects.json", () => {
    expect(ALL_GATING_BLOCKED).toHaveLength(11);
    for (const id of ALL_GATING_BLOCKED) {
      expect(effects[id], `${id} missing from effects.json`).toBeTruthy();
    }
  });

  for (const id of RAW_BLOCKED) {
    it(`${id} carries no RawUnparsed marker (top-level or nested) and no blocking residual`, () => {
      const card = effects[id];
      expect(card, `${id} missing from effects.json`).toBeTruthy();
      expect(JSON.stringify(card)).not.toContain("RawUnparsed");
      const residual = card?.residual ?? [];
      // No residual may name a still-blocking unmodeled clause via the RawUnparsed sentinel.
      for (const r of residual) expect(r).not.toContain("RawUnparsed");
      if (!ALLOWED_RESIDUAL.has(id)) {
        expect(residual, `${id} should have an empty residual post-alignment`).toHaveLength(0);
      }
    });
  }

  for (const id of STUB_BLOCKED) {
    it(`${id} carries no GrantStatic SelectionCap stub token`, () => {
      const card = effects[id];
      expect(card, `${id} missing from effects.json`).toBeTruthy();
      const offending = walkActions(card ?? {}).filter(
        (act) =>
          act.kind === "GrantStatic" &&
          Array.isArray(act.tokens) &&
          act.tokens.some((t) => typeof t === "string" && t.startsWith("SelectionCap")),
      );
      expect(offending, `${id} still has GrantStatic SelectionCap tokens`).toHaveLength(0);
    });
  }
});
