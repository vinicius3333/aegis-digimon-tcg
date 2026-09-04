import { describe, it, expect } from "vitest";
import { EffectDuration, Permanent, type Seat } from "@aegis/shared";
import { setupEngine } from "../testkit/harness.js";
import { ModifierLedger } from "./modifiers.js";

describe("ModifierLedger DP modifiers", () => {
  it("applies player-wide deltas to current and future Digimon until the duration expires", () => {
    const s = setupEngine({ 1: { battleArea: [{ card: "AD1-001", dp: 7000, as: "current" }] } });
    const ledger = new ModifierLedger();
    ledger.addPlayerDpModifier(s.state, 1, -6000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("current").currentDP).toBe(1000);

    const future = setupEngine({ 1: { battleArea: [{ card: "AD1-001", dp: 6000, as: "future" }] } }).perm("future");
    s.state.players[1]!.battleArea.push(future);
    ledger.recomputeDP(s.state, future.permanentId);
    expect(future.currentDP).toBe(0);

    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(s.perm("current").currentDP).toBe(7000);
    expect(future.currentDP).toBe(6000);
  });

  it("frames a player-wide next-opponent-turn delta from its effect owner", () => {
    const s = setupEngine({ 1: { battleArea: [{ card: "AD1-001", dp: 7000, as: "current" }] } });
    const ledger = new ModifierLedger();
    ledger.addPlayerDpModifier(s.state, 1, -5000, EffectDuration.UntilOpponentTurnEnd, {
      ownerSeat: 0,
      skipsCurrentOpponentTurnEnd: true,
    });
    expect(s.perm("current").currentDP).toBe(2000);

    ledger.sweep(s.state, "eachTurnEnd", 1);
    ledger.sweep(s.state, "ownerTurnEnd", 1);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(s.perm("current").currentDP).toBe(2000);

    ledger.sweep(s.state, "eachTurnEnd", 0);
    ledger.sweep(s.state, "eachTurnEnd", 1);
    expect(s.perm("current").currentDP).toBe(7000);
  });

  it("recomputes currentDP from baseDP plus active deltas", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();

    ledger.addDpModifier(s.state, p1, 2000, EffectDuration.UntilOpponentTurnEnd);
    expect(permanent.currentDP).toBe(5000);

    ledger.addDpModifier(s.state, p1, 1000, EffectDuration.UntilEndBattle);
    expect(permanent.currentDP).toBe(6000);
    expect(ledger.dpDeltaOf(p1)).toBe(3000);
  });

  it("floors currentDP at 0 for large negative modifiers", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 1000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();
    ledger.addDpModifier(s.state, permanent.permanentId, -5000, EffectDuration.UntilEachTurnEnd);
    expect(permanent.currentDP).toBe(0);
  });

  it("ignores a modifier targeting an unknown permanent (no throw)", () => {
    const s = setupEngine();
    const ledger = new ModifierLedger();
    expect(() => ledger.addDpModifier(s.state, "ghost", 1000, EffectDuration.UntilEndBattle)).not.toThrow();
    expect(ledger.dpDeltaOf("ghost")).toBe(1000); // recorded, but no permanent to write
  });
});

describe("ModifierLedger sweep by duration boundary", () => {
  it("UntilOpponentTurnEnd clears when the OWNER's opponent turn ends and restores DP", () => {
    // Permanent owned by seat 0; modifier lasts until seat 0's opponent (seat 1) turn ends.
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();
    ledger.addDpModifier(s.state, p1, 2000, EffectDuration.UntilOpponentTurnEnd);
    expect(permanent.currentDP).toBe(5000);

    // Owner's own turn ending (seat 0) must NOT clear it.
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(permanent.currentDP).toBe(5000);

    // Opponent's turn ending (seat 1) clears it; DP recomputed back to base.
    ledger.sweep(s.state, "ownerTurnEnd", 1);
    expect(permanent.currentDP).toBe(3000);
    expect(ledger.dpDeltaOf(p1)).toBe(0);
  });

  it("UntilEndBattle clears on endBattle but survives endAttack-only", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();
    ledger.addDpModifier(s.state, permanent.permanentId, 1000, EffectDuration.UntilEndBattle);

    ledger.sweep(s.state, "endAttack", 0);
    expect(permanent.currentDP).toBe(4000); // survives end-of-attack

    ledger.sweep(s.state, "endBattle", 0);
    expect(permanent.currentDP).toBe(3000);
  });

  it("UntilEndAttack clears on endAttack", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();
    ledger.addDpModifier(s.state, permanent.permanentId, 1000, EffectDuration.UntilEndAttack);
    ledger.sweep(s.state, "endAttack", 0);
    expect(permanent.currentDP).toBe(3000);
  });
});

describe("ModifierLedger pierce and evo-cost", () => {
  it("grants and reports pierce until its boundary", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const p1 = s.perm("p1").permanentId;
    const ledger = new ModifierLedger();
    ledger.addPierceGrant(p1, EffectDuration.UntilEndBattle);
    expect(ledger.hasPierce(p1)).toBe(true);
    ledger.sweep(s.state, "endBattle", 0);
    expect(ledger.hasPierce(p1)).toBe(false);
  });

  it("accumulates additive evo-cost deltas and layers deltas on top of a fixed base", () => {
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    target.controllerSeat = 0;

    const d1 = ledger.addEvoCostAdjustment(() => true, -1, false);
    const d2 = ledger.addEvoCostAdjustment(() => true, -1, false);
    expect(ledger.evoCostFor(target)).toEqual({ delta: -2 });

    // A fixed base alone (no deltas) returns that absolute cost.
    ledger.removeEvoCostAdjustment(d1.id);
    ledger.removeEvoCostAdjustment(d2.id);
    ledger.addEvoCostAdjustment(() => true, 4, true); // setFixed = 4 (e.g. security count)
    expect(ledger.evoCostFor(target)).toEqual({ fixed: 4 });

    // KB BT7-040 Q1568: the SET base is computed first, then a -2 reduction subtracts
    // from it (4 - 2 = 2), rather than the SET silently overriding the reduction.
    ledger.addEvoCostAdjustment(() => true, -2, false);
    expect(ledger.evoCostFor(target)).toEqual({ fixed: 2 });
  });

  it("consumes once evo-cost adjustments only on a successful consume query", () => {
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    target.controllerSeat = 0;

    ledger.addEvoCostAdjustment(() => true, -5, false, { once: true });

    expect(ledger.evoCostFor(target)).toEqual({ delta: -5 });
    expect(ledger.evoCostFor(target)).toEqual({ delta: -5 });
    expect(ledger.evoCostFor(target, undefined, { consumeOnce: true })).toEqual({ delta: -5 });
    expect(ledger.evoCostFor(target)).toBeUndefined();
  });

  it("runs an onConsume callback exactly when a once evo-cost adjustment is consumed", () => {
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    target.controllerSeat = 0;
    const consumed: string[] = [];

    ledger.addEvoCostAdjustment(() => true, -6, false, {
      once: true,
      onConsume: ({ target: consumedTarget }) => consumed.push(consumedTarget.permanentId),
    });

    expect(ledger.evoCostFor(target)).toEqual({ delta: -6 });
    expect(consumed).toEqual([]);
    expect(ledger.evoCostFor(target, undefined, { consumeOnce: true })).toEqual({ delta: -6 });
    expect(consumed).toEqual(["x"]);
    expect(ledger.evoCostFor(target, undefined, { consumeOnce: true })).toBeUndefined();
    expect(consumed).toEqual(["x"]);
  });

  it("returns undefined when no evo-cost adjustment matches", () => {
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    ledger.addEvoCostAdjustment(({ target: candidate }) => candidate.permanentId === "other", -1, false);
    expect(ledger.evoCostFor(target)).toBeUndefined();
  });

  it("clearContinuous drops only continuous modifiers, keeping one-shot ones", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();
    // One-shot (triggered) buff and a continuous (static) buff on the same permanent.
    ledger.addDpModifier(s.state, p1, 1000, EffectDuration.UntilEachTurnEnd);
    ledger.addDpModifier(s.state, p1, 2000, EffectDuration.UntilEachTurnEnd, { continuous: true });
    expect(permanent.currentDP).toBe(6000);

    ledger.clearContinuous(s.state);
    // Continuous +2000 dropped; one-shot +1000 survives and DP recomputed.
    expect(permanent.currentDP).toBe(4000);
    expect(ledger.dpDeltaOf(p1)).toBe(1000);
  });

  it("playCostFor reduces a matching play cost and floors at 0", () => {
    const ledger = new ModifierLedger();
    const def = { kinds: [], colors: [] } as unknown as import("@aegis/shared").CardDefinition;
    const facts = { def, controllerSeat: 0 as Seat };
    expect(ledger.playCostFor(facts, 5)).toBe(5); // nothing matches
    ledger.addPlayCostAdjustment(() => true, -2, false, { continuous: true });
    expect(ledger.playCostFor(facts, 5)).toBe(3);
    ledger.addPlayCostAdjustment(() => true, -10, false, { continuous: true });
    expect(ledger.playCostFor(facts, 5)).toBe(0); // can't go below 0
    ledger.clearContinuous(setupEngine().state);
    expect(ledger.playCostFor(facts, 5)).toBe(5); // continuous adjustments cleared
  });

  it("playCostFor layers deltas on top of a setFixed base (KB BT7-040 Q1568)", () => {
    const ledger = new ModifierLedger();
    const def = { kinds: [], colors: [] } as unknown as import("@aegis/shared").CardDefinition;
    const facts = { def, controllerSeat: 0 as Seat };

    // A SET replaces the printed base (P-116-style "this card costs 0").
    ledger.addPlayCostAdjustment(() => true, 0, true);
    expect(ledger.playCostFor(facts, 4)).toBe(0);

    // KB Q1568: the SET value is computed first, then a -2 reduction subtracts from it
    // (4 - 2 = 2), rather than the SET overriding the reduction.
    const ledger2 = new ModifierLedger();
    ledger2.addPlayCostAdjustment(() => true, 4, true); // SET base = 4 (e.g. security count)
    expect(ledger2.playCostFor(facts, 7)).toBe(4); // SET replaces the printed 7
    ledger2.addPlayCostAdjustment(() => true, -2, false); // a separate -2 reduction
    expect(ledger2.playCostFor(facts, 7)).toBe(2); // 4 - 2, not 4 and not 5
  });

  it("drops a permanent's DP/pierce modifiers but not source-keyed evo adjustments", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 3000, as: "p1" }] } });
    const p1 = s.perm("p1").permanentId;
    const ledger = new ModifierLedger();
    ledger.addDpModifier(s.state, p1, 1000, EffectDuration.UntilEndBattle);
    ledger.addPierceGrant(p1, EffectDuration.UntilEndBattle);
    const adj = ledger.addEvoCostAdjustment(() => true, -1, false);

    ledger.dropPermanent(p1);
    expect(ledger.dpDeltaOf(p1)).toBe(0);
    expect(ledger.hasPierce(p1)).toBe(false);

    const target = new Permanent();
    target.permanentId = "x";
    expect(ledger.evoCostFor(target)).toEqual({ delta: -1 }); // untouched
    ledger.removeEvoCostAdjustment(adj.id);
    expect(ledger.evoCostFor(target)).toBeUndefined();
  });

  // WR-01 (engine-audit finding 1): a one-shot triggered evo-cost/play-cost
  // adjustment (RB1-034 subtrigger, BT4-095 BeforePayCost, EX5-043 WhenDigivolving/
  // Main) previously had no duration at all — sweep() never touched
  // evoCostAdjustments/playCostAdjustments — so it accumulated PERMANENTLY across
  // every activation for the rest of the match. It must instead expire at the next
  // turn-end boundary like other one-shot, duration-scoped modifiers.
  it("a one-shot (non-continuous) evo-cost adjustment expires at the next turn-end sweep", () => {
    const s = setupEngine();
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    target.controllerSeat = 0;

    ledger.addEvoCostAdjustment(() => true, -1, false);
    expect(ledger.evoCostFor(target)).toEqual({ delta: -1 });

    // A second activation on a later turn must not stack onto a still-alive first one.
    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(ledger.evoCostFor(target)).toBeUndefined();

    ledger.addEvoCostAdjustment(() => true, -1, false);
    expect(ledger.evoCostFor(target)).toEqual({ delta: -1 }); // still just -1, not -2
  });

  it("a continuous evo-cost adjustment survives turn-end sweeps and is cleared only by clearContinuous", () => {
    const s = setupEngine();
    const ledger = new ModifierLedger();
    const target = new Permanent();
    target.permanentId = "x";
    target.controllerSeat = 0;

    ledger.addEvoCostAdjustment(() => true, -1, false, { continuous: true });
    ledger.sweep(s.state, "eachTurnEnd", 0);
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(ledger.evoCostFor(target)).toEqual({ delta: -1 }); // untouched by boundary sweeps

    ledger.clearContinuous(s.state);
    expect(ledger.evoCostFor(target)).toBeUndefined();
  });

  it("a one-shot (non-continuous) play-cost adjustment expires at the next turn-end sweep", () => {
    const s = setupEngine();
    const ledger = new ModifierLedger();
    const def = { kinds: [], colors: [] } as unknown as import("@aegis/shared").CardDefinition;
    const facts = { def, controllerSeat: 0 as Seat };

    ledger.addPlayCostAdjustment(() => true, -1, false);
    expect(ledger.playCostFor(facts, 5)).toBe(4);

    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(ledger.playCostFor(facts, 5)).toBe(5); // reduction gone, not stacked

    ledger.addPlayCostAdjustment(() => true, -1, false);
    expect(ledger.playCostFor(facts, 5)).toBe(4); // still just -1, not -2
  });

  it("a continuous play-cost adjustment survives turn-end sweeps and is cleared only by clearContinuous", () => {
    const s = setupEngine();
    const ledger = new ModifierLedger();
    const def = { kinds: [], colors: [] } as unknown as import("@aegis/shared").CardDefinition;
    const facts = { def, controllerSeat: 0 as Seat };

    ledger.addPlayCostAdjustment(() => true, -1, false, { continuous: true });
    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(ledger.playCostFor(facts, 5)).toBe(4); // untouched by boundary sweeps

    ledger.clearContinuous(s.state);
    expect(ledger.playCostFor(facts, 5)).toBe(5);
  });
});

describe("ModifierLedger base-DP overrides (SetBaseDP)", () => {
  it("replaces the printed base DP with the override value", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 4000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();

    // BT3-014 Q1056: target's DP becomes 1000 regardless of printed DP.
    ledger.addBaseDpOverride(s.state, permanent.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
    expect(permanent.currentDP).toBe(1000);
  });

  it("layers signed DP deltas on top of the override (Q4864: 16000 - 3000 = 13000)", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 11000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();

    ledger.addBaseDpOverride(s.state, p1, 16000, EffectDuration.UntilEachTurnEnd);
    ledger.addDpModifier(s.state, p1, -3000, EffectDuration.UntilOpponentTurnEnd);
    expect(permanent.currentDP).toBe(13000);
  });

  it("clamps to 0 when a coexisting delta cancels the override (Q1057: 1000 - 1000 = 0)", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 5000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();

    ledger.addDpModifier(s.state, p1, -1000, EffectDuration.UntilOpponentTurnEnd);
    ledger.addBaseDpOverride(s.state, p1, 1000, EffectDuration.UntilEachTurnEnd);
    expect(permanent.currentDP).toBe(0);
  });

  it("resolves competing overrides last-applied-wins (Q4865: later 3000 override wins)", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 11000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const p1 = permanent.permanentId;
    const ledger = new ModifierLedger();

    ledger.addBaseDpOverride(s.state, p1, 16000, EffectDuration.UntilEachTurnEnd);
    ledger.addBaseDpOverride(s.state, p1, 3000, EffectDuration.UntilEachTurnEnd);
    expect(permanent.currentDP).toBe(3000);
  });

  it("reverts to the printed base DP when the override expires at its boundary", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 4000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();

    ledger.addBaseDpOverride(s.state, permanent.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
    expect(permanent.currentDP).toBe(1000);
    ledger.sweep(s.state, "eachTurnEnd", 0);
    expect(permanent.currentDP).toBe(4000);
  });

  it("drops only continuous overrides on the continuous-recompute sweep", () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", dp: 4000, as: "p1" }] } });
    const permanent = s.perm("p1");
    const ledger = new ModifierLedger();

    ledger.addBaseDpOverride(s.state, permanent.permanentId, 16000, EffectDuration.UntilEachTurnEnd, {
      continuous: true,
    });
    expect(permanent.currentDP).toBe(16000);
    ledger.clearContinuous(s.state);
    expect(permanent.currentDP).toBe(4000);
  });
});
