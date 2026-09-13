import { describe, expect, it } from "vitest";
import { EffectDuration, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, findPermanent } from "../testkit/harness.js";
import { internalsOf } from "../testkit/internals.js";
import "../../cards/index.js";

describe("duration identity after controller turnover", () => {
  it("keeps an opponent-turn grant anchored to its granting seat", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT13-077", as: "card" }] } });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    const continuous = internalsOf(s.engine).continuous;
    await settle(() =>
      player.battleArea.some((perm) => continuous.hasRestriction(perm.permanentId, "beAffected", "Digimon")),
    );
    const permanent = findPermanent(s, 0, "BT13-077");
    permanent.controllerSeat = 1;
    const ledger = internalsOf(s.engine).continuous;
    ledger.sweep(s.state, "ownerTurnEnd", 0);
    expect(ledger.hasRestriction(permanent.permanentId, "beAffected", "Digimon")).toBe(true);
    ledger.sweep(s.state, "opponentTurnEnd", 1);
    expect(ledger.hasRestriction(permanent.permanentId, "beAffected", "Digimon")).toBe(false);
  });
});

// Synthetic producer intersections exercise the shared target-based expiry seam;
// the BT13-077 case above separately installs a real printed effect.
describe("target duration snapshots across grant categories", () => {
  it("keeps separate endpoints for grants installed before and after turnover", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-019", as: "target" }] } });
    await s.ready();
    const { continuous, modifiers, primitives } = internalsOf(s.engine);
    const target = s.perm("target");
    const id = target.permanentId;
    continuous.addKeywordGrant(id, "Rush", EffectDuration.UntilOpponentTurnEnd);
    continuous.addNameTraitGrant(id, "name", ["Old alias"], EffectDuration.UntilOpponentTurnEnd);
    continuous.addColorGrant(id, "Green", EffectDuration.UntilOpponentTurnEnd);
    continuous.addLinkMaxGrant(id, 1, EffectDuration.UntilOpponentTurnEnd);
    modifiers.addDpModifier(s.state, id, 1000, EffectDuration.UntilOpponentTurnEnd);
    modifiers.addBaseDpOverride(s.state, id, 6000, EffectDuration.UntilOpponentTurnEnd);
    modifiers.addMinDpFloor(s.state, id, 8000, EffectDuration.UntilOpponentTurnEnd);
    primitives.grantPierce(id, EffectDuration.UntilOpponentTurnEnd);
    expect(target.currentDP).toBe(8000);
    expect(modifiers.hasPierce(id)).toBe(true);
    target.controllerSeat = 1;
    continuous.addKeywordGrant(id, "Blocker", EffectDuration.UntilOpponentTurnEnd);
    continuous.sweep(s.state, "opponentTurnEnd", 0);
    modifiers.sweep(s.state, "opponentTurnEnd", 0);
    expect(continuous.hasKeyword(id, "Rush")).toBe(true);
    expect(continuous.hasKeyword(id, "Blocker")).toBe(false);
    expect(continuous.grantedNames(id)).toEqual(["old alias"]);
    expect(continuous.grantedColors(id)).toEqual(["Green"]);
    expect(continuous.linkMaxDelta(id)).toBe(1);
    expect(target.currentDP).toBe(8000);
    expect(modifiers.hasPierce(id)).toBe(true);
    continuous.sweep(s.state, "opponentTurnEnd", 1);
    modifiers.sweep(s.state, "opponentTurnEnd", 1);
    expect(continuous.hasKeyword(id, "Rush")).toBe(false);
    expect(continuous.grantedNames(id)).toEqual([]);
    expect(continuous.grantedColors(id)).toEqual([]);
    expect(continuous.linkMaxDelta(id)).toBe(0);
    expect(modifiers.baseDpOverridesOf(id)).toEqual([]);
    expect(target.currentDP).toBe(target.baseDP);
    expect(modifiers.hasPierce(id)).toBe(false);
  });
});
