import { describe, it, expect } from "vitest";
import { EffectDuration, type PlayerState } from "@aegis/shared";
import { makeDigimon as digimon, setupEngine as setup } from "../testkit/harness.js";
import { internalsOf } from "../testkit/internals.js";
import "../../cards/index.js";

/**
 * `Permanent.cannotAttack` / `cannotBlock` / `securityAttack` are the server's answers to
 * "what may this position do in combat right now?", published so the client can pulse an
 * imposed lock and read out a truthful security-check count without rebuilding either rule.
 *
 * Every assertion drives the projection through `recomputeContinuousEffects`, the one pass
 * that owns it, and through the same ledger writers the card effects themselves use — so a
 * projection that stopped agreeing with the rules fails here.
 */

const VANILLA_CARD = "AD1-001"; // no keywords

describe("Permanent combat-restriction projection", () => {
  it("publishes an imposed attack lock, and clears it when the restriction lapses", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000, VANILLA_CARD);
    p0.battleArea.push(perm);
    const { continuous } = internalsOf(s.engine);

    await s.engine.recomputeContinuousEffects();
    expect(perm.cannotAttack).toBe(false);

    continuous.addRestriction(perm.permanentId, "attack", EffectDuration.UntilEachTurnEnd);
    await s.engine.recomputeContinuousEffects();
    expect(perm.cannotAttack).toBe(true);
    // A block lock is a separate question and must not ride along.
    expect(perm.cannotBlock).toBe(false);
  });

  it("publishes an imposed block lock on its own", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000, VANILLA_CARD);
    p0.battleArea.push(perm);
    internalsOf(s.engine).continuous.addRestriction(perm.permanentId, "block", EffectDuration.UntilEachTurnEnd);

    await s.engine.recomputeContinuousEffects();
    expect(perm.cannotBlock).toBe(true);
    expect(perm.cannotAttack).toBe(false);
  });

  it("stays false for summoning sickness, which is a different question entirely", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnCount = 1;
    const fresh = digimon(0, 5000, VANILLA_CARD);
    fresh.enterFieldTurnCount = s.state.turnCount;
    p0.battleArea.push(fresh);

    await s.engine.recomputeContinuousEffects();
    expect(fresh.summoningSick).toBe(true);
    expect(fresh.cannotAttack).toBe(false);
  });

  it("projects both seats, so a lock on the opponent's board is visible too", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const theirs = digimon(1, 5000, VANILLA_CARD);
    p1.battleArea.push(theirs);
    internalsOf(s.engine).continuous.addRestriction(theirs.permanentId, "attack", EffectDuration.UntilEachTurnEnd);

    await s.engine.recomputeContinuousEffects();
    expect(theirs.cannotAttack).toBe(true);
  });
});

describe("Permanent.securityAttack projection", () => {
  it("reads 1 with no modifier at all", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000, VANILLA_CARD);
    p0.battleArea.push(perm);

    await s.engine.recomputeContinuousEffects();
    expect(perm.securityAttack).toBe(1);
  });

  it("adds every ＜Security Attack +N＞ grant the engine resolved", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000, VANILLA_CARD);
    p0.battleArea.push(perm);
    const { continuous } = internalsOf(s.engine);
    continuous.addKeywordGrant(perm.permanentId, "SecurityAttack", EffectDuration.UntilEachTurnEnd, 2);

    await s.engine.recomputeContinuousEffects();
    expect(perm.securityAttack).toBe(3);
  });

  it("floors at 0 under a negative modifier (Comprehensive Rules §16-4-4)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 5000, VANILLA_CARD);
    p0.battleArea.push(perm);
    internalsOf(s.engine).continuous.addKeywordGrant(
      perm.permanentId,
      "SecurityAttack",
      EffectDuration.UntilEachTurnEnd,
      -3,
    );

    await s.engine.recomputeContinuousEffects();
    expect(perm.securityAttack).toBe(0);
  });
});
