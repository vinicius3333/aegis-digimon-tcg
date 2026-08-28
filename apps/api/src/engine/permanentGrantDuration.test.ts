import { describe, it, expect } from "vitest";
import { EffectDuration } from "@aegis/shared";
import type { ContinuousEffectLedger } from "./effects/continuous.js";
import { setupEngine } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * Phase 7.1 A3 — grant-duration semantics (ENG-02 / WR-03 / WR-04).
 *
 * Proves, at the continuous-ledger level (mirroring continuousLapse.test.ts's
 * direct-ledger approach so the proof isolates duration semantics without coupling
 * to a specific compiled card's IR), that:
 *
 *   A3a (SC-1, WR-03): a genuinely-permanent name/trait/color grant from a resolved
 *     (triggered, non-static) effect survives EVERY turn-end boundary sweep.
 *   A3b (SC-2, WR-04): an owner-scoped "until your/their turn ends" grant clears only
 *     at the CORRECT owner's turn-end boundary.
 *   A3c (SC-3): a Permanent grant with no continuous flag persists across >= 2
 *     recomputeContinuousEffects() calls, while a continuous-flagged Permanent grant
 *     IS dropped by clearContinuous (no double-stack) — the CR-01 discipline holds.
 */

function ledgerOf(s: { engine: unknown }): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

describe("A3a permanent name/trait/color grant survives turn-end boundaries (SC-1, WR-03)", () => {
  /*
   * FAILS-WHEN-REVERTED LEVER: revert Task 1 (map "permanent" back to
   * EffectDuration.UntilEachTurnEnd in interpreter.ts toDuration) OR Task 2 (drop the
   * `case EffectDuration.Permanent: return false;` in continuous.ts clearsAt) — the grant
   * is then treated as UntilEachTurnEnd and the eachTurnEnd sweep below removes it, so the
   * "still present after sweep" assertions go RED.
   */
  it("a Permanent name/trait/color grant (no continuous flag) is not swept at any turn-end boundary", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] } });
    const ledger = ledgerOf(s);
    const targetId = s.perm("target").permanentId;

    // Resolved/triggered-effect shape: Permanent duration, NO continuous flag.
    ledger.addNameTraitGrant(targetId, "name", ["Greymon"], EffectDuration.Permanent);
    ledger.addNameTraitGrant(targetId, "trait", ["Dragon"], EffectDuration.Permanent);
    ledger.addColorGrant(targetId, "blue", EffectDuration.Permanent);

    const stillThere = (): boolean =>
      ledger.grantedNames(targetId).includes("greymon") &&
      ledger.grantedTraits(targetId).includes("dragon") &&
      ledger.grantedColors(targetId).includes("blue");

    expect(stillThere()).toBe(true);

    // Drive every turn-end boundary kind; owner is seat 0.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(stillThere()).toBe(true);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(stillThere()).toBe(true);
    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(stillThere()).toBe(true);
  });

  it("negative control: a sibling UntilEachTurnEnd grant DOES clear at eachTurnEnd (A3a is not vacuously green)", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] } });
    const ledger = ledgerOf(s);
    const targetId = s.perm("target").permanentId;

    ledger.addNameTraitGrant(targetId, "name", ["Greymon"], EffectDuration.UntilEachTurnEnd);
    expect(ledger.grantedNames(targetId)).toContain("greymon");

    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(ledger.grantedNames(targetId)).not.toContain("greymon");
  });
});

describe("A3b owner-scoped turn grant clears only at the correct owner's turn-end (SC-2, WR-04)", () => {
  /*
   * FAILS-WHEN-REVERTED LEVER: make clearsAt owner-agnostic for the owner-relative
   * durations (drop the `ownerSeat === sweepSeat` / `ownerSeat !== sweepSeat` gate in
   * continuous.ts clearsAt) — the grant then clears at the WRONG owner's turn end, so the
   * "still present at the wrong owner's boundary" assertions go RED.
   */
  it("UntilOwnerTurnEnd: survives the wrong owner's turn end, clears at the correct owner's turn end", () => {
    // owner = seat 0
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "owned" }] } });
    const ledger = ledgerOf(s);
    const ownedId = s.perm("owned").permanentId;

    ledger.addNameTraitGrant(ownedId, "name", ["Greymon"], EffectDuration.UntilOwnerTurnEnd);

    // Wrong owner's turn end (seat 1) — still present.
    ledger.sweep(s.state, "ownerTurnEnd", 1);
    expect(ledger.grantedNames(ownedId)).toContain("greymon");

    // Correct owner's turn end (seat 0) — gone.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(ledger.grantedNames(ownedId)).not.toContain("greymon");
  });

  it("UntilOpponentTurnEnd: survives the owner's own turn end, clears at the opponent's turn end", () => {
    // owner = seat 0
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "owned" }] } });
    const ledger = ledgerOf(s);
    const ownedId = s.perm("owned").permanentId;

    ledger.addNameTraitGrant(ownedId, "name", ["Greymon"], EffectDuration.UntilOpponentTurnEnd);

    // Owner's own turn end (seat 0) — an UntilOpponentTurnEnd grant must survive.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(ledger.grantedNames(ownedId)).toContain("greymon");

    // Opponent's turn end (seat 1) — gone.
    ledger.sweep(s.state, "ownerTurnEnd", 1);
    expect(ledger.grantedNames(ownedId)).not.toContain("greymon");
  });

  it("negative control: an UntilOwnerTurnEnd grant is unaffected by an endBattle boundary", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "owned" }] } });
    const ledger = ledgerOf(s);
    const ownedId = s.perm("owned").permanentId;

    ledger.addNameTraitGrant(ownedId, "name", ["Greymon"], EffectDuration.UntilOwnerTurnEnd);
    ledger.sweep(s.state, "endBattle", 0);
    expect(ledger.grantedNames(ownedId)).toContain("greymon");
  });
});

describe("A3c Permanent grant persists across recomputes; continuous-flagged is re-derived (SC-3, CR-01)", () => {
  /*
   * FAILS-WHEN-REVERTED LEVER: if clearContinuous were widened to drop non-continuous
   * permanent grants (e.g. filter on duration instead of the continuous flag), the
   * "survives 2 recomputes" assertions go RED.
   */
  it("a no-flag Permanent grant survives >= 2 clearContinuous calls; a continuous-flagged one is dropped", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] } });
    const ledger = ledgerOf(s);
    const targetId = s.perm("target").permanentId;

    // Triggered-window install (no continuous flag) — must persist through clearContinuous.
    ledger.addColorGrant(targetId, "blue", EffectDuration.Permanent);
    // Static-recompute install (continuous:true) — must be dropped by clearContinuous so the
    // static path re-derives each pass and never double-stacks (the CR-01 hazard).
    ledger.addColorGrant(targetId, "green", EffectDuration.Permanent, { continuous: true });

    ledger.clearContinuous();
    ledger.clearContinuous();

    expect(ledger.grantedColors(targetId)).toContain("blue");
    expect(ledger.grantedColors(targetId)).not.toContain("green");
  });

  it("a no-flag Permanent grant persists across >= 2 recomputeContinuousEffects() calls and does not double-stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] } });
    const ledger = ledgerOf(s);
    const targetId = s.perm("target").permanentId;

    ledger.addNameTraitGrant(targetId, "name", ["Greymon"], EffectDuration.Permanent);

    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    const names = ledger.grantedNames(targetId);
    expect(names).toContain("greymon");
    // No double-stack: exactly one "greymon" entry after two recomputes.
    expect(names.filter((n) => n === "greymon")).toHaveLength(1);
  });

  it("negative control: a continuous-flagged UntilEachTurnEnd grant is also dropped by clearContinuous", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] } });
    const ledger = ledgerOf(s);
    const targetId = s.perm("target").permanentId;

    ledger.addColorGrant(targetId, "green", EffectDuration.UntilEachTurnEnd, { continuous: true });
    expect(ledger.grantedColors(targetId)).toContain("green");

    ledger.clearContinuous();
    expect(ledger.grantedColors(targetId)).not.toContain("green");
  });
});
