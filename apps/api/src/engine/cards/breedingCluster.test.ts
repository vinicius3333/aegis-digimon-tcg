import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap, type EngineSetup } from "../testkit/harness.js";
// Importing the cards root barrel self-registers every compiled-IR / hand-written card
// module so the engine can look up On Play / Breeding effects by card id (boot side-effect).
import "../../cards/index.js";

/**
 * Per-cluster A3 — breeding/hatch mechanic (CARD-01, plan 04-08).
 *
 * Drives the breeding cluster's COMPILED IR through the real GameEngine (real interpreter +
 * real createPrimitives + real breeding.ts verbs), asserting the resulting GameState delta.
 * This is the behavioral oracle for the new effect-driven hatch / egg-deck place-under
 * primitives (breeding.ts), which the Digi-Egg-deck-blind loose-card helpers could not serve.
 *
 * Cluster members and their proof here:
 *   - BT8-091  [On Play] hatch a Digi-Egg into the empty breeding slot  — A3 #1 (play-driven,
 *     fails-when-reverted: reverting `hatch` to a no-op leaves the breeding slot empty).
 *   - EX6-006  [Breeding] place top of Digi-Egg deck as bottom digivolution card + delete all
 *     your Digimon — A3 #2 (timing-driven through fireTiming; asserts the egg lands under the
 *     breeding self AND the battle-area Digimon is deleted).
 *   - BT13-007 [Breeding] place top of Digi-Egg deck + all [Royal Knight] Digimon under this —
 *     A3 #3 (timing-driven; asserts the egg AND the battle-area Royal Knight both relocate
 *     under the breeding self).
 *   - P-130 / P-143 (breeding<->battle MOVE) are already proven by the existing movePermanentZone
 *     coverage (mechanic.test.ts MovePermanent) and were authored before this plan.
 */

/**
 * Fire a timing window for a specific source permanent through the engine's REAL fireTiming
 * seam (private; reached with the same `as unknown as` access the sibling A3 file uses for the
 * continuous/modifier ledgers). This drives a [Breeding]/[Start of Your Main Phase] effect
 * exactly as the turn loop would, running the real interpreter and real primitives.
 */
async function fireTiming(
  s: EngineSetup,
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  const engine = s.engine as unknown as {
    fireTiming(t: EffectTiming, trig?: Record<string, unknown>): Promise<void>;
  };
  await engine.fireTiming(timing, trigger);
}

describe("A3 breeding/hatch — effect-driven hatch into the breeding area", () => {
  // BT8-091 (Willis): Green Lv.3 Tamer, cost 3; [On Play] (optional) hatch 1 Digi-Egg.
  // FAILS-WHEN-REVERTED lever: revert the `hatch` primitive (breeding.ts) to `return undefined`
  // and the breeding slot stays empty (egg deck untouched) — the assertions below go RED.
  it("BT8-091 [On Play] hatches the top Digi-Egg into the empty breeding slot", async () => {
    const s = setupEngine(
      {
        0: {
          // Top of the Digi-Egg deck: a real Digi-Egg (BT1-001, kind DigiEgg, DP 0).
          eggDeck: [{ card: "BT1-001", as: "egg" }, "BT1-002"],
          hand: [{ card: "BT8-091", as: "source" }], // the Tamer to play
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const egg = s.inst("egg");
    const source = s.inst("source");
    s.state.memory = 3;

    expect(p0.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.breeding !== undefined);

    // The egg left the top of the Digi-Egg deck and now occupies the breeding slot face-up.
    expect(p0.breeding).toBeDefined();
    expect(p0.breeding?.topCard?.instanceId).toBe(egg.instanceId);
    expect(p0.breeding?.inBreeding).toBe(true);
    expect(p0.breeding?.topCard?.faceUp).toBe(true);
    expect(p0.eggDeck.some((c) => c.instanceId === egg.instanceId)).toBe(false);
    expect(p0.eggDeck).toHaveLength(1); // filler remains
    assertNoLoudGap(s);
  });

  // A hatch into an OCCUPIED breeding area is a faithful no-op (§6-4 hatches only into an empty
  // area). This proves the primitive's single-occupancy guard, not just the happy path.
  it("BT8-091 [On Play] does not hatch when the breeding area is already occupied", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "sitting" },
          eggDeck: [{ card: "BT1-002", as: "egg" }],
          hand: [{ card: "BT8-091", as: "source" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const sitting = s.perm("sitting");
    const egg = s.inst("egg");
    const source = s.inst("source");
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 30);

    // The breeding slot still holds the original permanent; the egg never left the deck.
    expect(p0.breeding?.permanentId).toBe(sitting.permanentId);
    expect(p0.eggDeck.some((c) => c.instanceId === egg.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 breeding/hatch — place top of Digi-Egg deck under a permanent", () => {
  // BT13-007 (King Drasil_7D6): a [Breeding][Start of Your Main Phase] resident (KB Q2259-Q2265
  // confirm this is a compound-[Breeding] clause — the card lives in the RAISING/breeding area,
  // not the battle area, while this effect is live; documented behavior IsExistOnBreedingArea). Every effect
  // parsed with `isBreeding:true` — including this duplicated StartOfYourMainPhase clause —
  // routes through the `breeding` timing builder (builders.ts), whose base guard requires
  // `ctx.source.isOnBreedingArea()`; a battle-area source never triggers it. Places the top
  // Digi-Egg AND all [Royal Knight] trait Digimon under THIS Digimon as its bottom digivolution
  // cards — proving both new seams end-to-end: the egg-deck place-under (placeUnderFromEggDeck)
  // and the relocate-under-self of a battle-area Royal Knight.
  //
  // FAILS-WHEN-REVERTED lever: revert `placeUnderFromEggDeck` (breeding.ts) to `return
  // undefined` and the egg never lands under the host — the egg-stack assertion goes RED.
  it("BT13-007 [Start of Your Main Phase] places the top Digi-Egg and a Royal Knight under itself", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", dp: 11000, as: "self" },
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          // A battle-area Digimon with the [Royal Knight] trait. AD1-008 (Gallantmon) carries the
          // Royal Knight trait (in its `types`) in the card DB; it should relocate under self.
          battleArea: [{ card: "AD1-008", dp: 12000, as: "knight" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const self = s.perm("self");
    const egg = s.inst("egg");
    const knight = s.perm("knight");
    const knightInstanceId = knight.topCard!.instanceId;

    // The IR `StartOfYourMainPhase` clause (a duplicate of the [Breeding] clause) maps to the
    // discrete OnStartMainPhase window; the [Breeding] trigger itself is a static/None window.
    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    await settle(() => self.stack.some((c) => c.instanceId === egg.instanceId));

    // Both the egg (from the Digi-Egg deck) and the Royal Knight are now under the host.
    expect(self.stack.some((c) => c.instanceId === egg.instanceId)).toBe(true);
    expect(self.stack.find((c) => c.instanceId === egg.instanceId)?.faceUp).toBe(false);
    expect(self.stack.some((c) => c.instanceId === knightInstanceId)).toBe(true);
    expect(p0.battleArea.some((p) => p.permanentId === knight.permanentId)).toBe(false);
    expect(p0.eggDeck.some((c) => c.instanceId === egg.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  // EX6-006 (Gate of Deadly Sins, a Digi-Egg): a [Breeding][Start of Your Main Phase] resident
  // (documented behavior IsExistOnBreedingArea) — the card lives in the RAISING area, and this effect's `[Breeding]`
  // qualifier is a LOCATION restriction (isBreeding:true routes it through the breeding-aware
  // builder, whose base guard requires ctx.source.isOnBreedingArea()), not an independent trigger
  // timing: the IR's actual trigger is "StartOfYourMainPhase", which buckets under
  // EffectTiming.OnStartMainPhase (timingForTrigger) — a discrete window fired via fireTiming, the
  // SAME seam the sibling BT13-007 case above uses. EffectTiming.None-bucketed effects (a card's
  // Static/Aura/Rule triggers) are what `recomputeContinuousEffects` re-derives each pass; a
  // "[Start of Your Main Phase]" clause is not among them regardless of its isBreeding flag, so this
  // drives it through fireTiming(OnStartMainPhase) instead. The egg-deck place runs first (Q3694),
  // then the delete-all sweeps the battle-area Digimon. The Digi-Egg source itself is NOT a Digimon,
  // so "delete all your Digimon" never deletes it.
  //
  // NOTE (07-05 deviation, Rule 1): the prior version of this test put EX6-006 in the BATTLE
  // area and asserted the Digi-Egg source got deleted by "delete all your Digimon" — both
  // incoherent (a Digi-Egg is not a Digimon, and a Digi-Egg does not sit in the battle area).
  // It only passed because the old engine let a `[Breeding]` effect fire while on the battle
  // area; the breeding-resident seam fix corrects that, so the test now drives the faithful
  // breeding-area scenario.
  it("EX6-006 [Breeding] places the top Digi-Egg then deletes all your Digimon (fires while in breeding)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX6-006", as: "self" }, // a Digi-Egg in the RAISING area
          eggDeck: [{ card: "BT1-001", as: "egg" }],
          battleArea: [{ card: "AD1-001", dp: 3000, as: "victim" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const self = s.perm("self");
    const egg = s.inst("egg");
    const victim = s.perm("victim");

    // StartOfYourMainPhase is a discrete fireTiming window (same seam as the BT13-007 case above);
    // recomputeContinuousEffects only re-derives EffectTiming.None (Static/Aura/Rule) effects.
    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    await settle(() => !p0.eggDeck.some((c) => c.instanceId === egg.instanceId));

    // The egg left the Digi-Egg deck (placeUnderFromEggDeck ran), the delete-all swept the
    // battle-area Digimon (the victim), and the breeding Digi-Egg source survives (not a Digimon).
    expect(p0.eggDeck.some((c) => c.instanceId === egg.instanceId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === victim.permanentId)).toBe(false);
    expect(p0.breeding?.permanentId).toBe(self.permanentId);
    assertNoLoudGap(s);
  });
});
