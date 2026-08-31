import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-004.js";

// A3 for BT15-004 (Motimon) — Green Lv.2 Digi-Egg.
//
// [End of Your Turn] [Inherited] If this Digimon has the [Insectoid] trait, it may
// attack an opponent's Digimon.  (documented behavior)
//
// KB Q2490 (binding): cannot attack with a suspended Digimon (CanAttack() check).
// KB Q2491 (binding): two copies → each activation is independent; second fails
//   if a new attack can't be declared during an active one.
//
const MOTIMON = "BT15-004";
// BT1-066 = Tentomon, an Insectoid Lv.3 Digimon (def.types includes "Insectoid").
const TENTOMON = "BT1-066";
// Any Digimon the opponent can field as a blocked target.
const DUMMY = "BT1-009";

function fireTiming(s: EngineSetup, timing: EffectTiming): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing);
}

describe("BT15-004 Motimon — [End of Your Turn][Inherited] Insectoid may attack", () => {
  it("registers only compiled IR for the inherited Insectoid attack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Attack",
          attackPlayer: false,
          optional: true,
          drainTimingWindowDuringAttack: true,
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
  });

  it("triggers an attack with an Insectoid Digimon that has BT15-004 in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          // Set up an Insectoid Digimon for seat 0 with BT15-004 (Motimon) in its digivolution stack.
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", under: [MOTIMON] }],
          // Security cards so the game doesn't end if the attack reaches the player.
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          // Opponent needs at least one Digimon for the canActivate check (and the attack target).
          battleArea: [{ card: DUMMY, dp: 3000, suspended: true }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.perm("tentomon").isSuspended).toBe(false);

    // Fire the [End of Your Turn] timing window.
    const timing = fireTiming(s, EffectTiming.OnEndTurn);

    // The optional "may attack" fires and auto-accepts (requestDecision mock above).
    // An attack suspends the attacker.
    await settle(() => s.perm("tentomon").isSuspended, 400);
    await timing;

    expect(s.perm("tentomon").isSuspended, "Tentomon must be suspended after its attack").toBe(true);
  });

  it("attacks through the natural end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", under: [MOTIMON] }],
          deck: [DUMMY],
        },
        1: { battleArea: [{ card: DUMMY, dp: 1000, as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("tentomon").isSuspended).toBe(true);
  });

  it("does NOT trigger when the Digimon is already suspended (KB Q2490)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TENTOMON, dp: 4000, as: "tentomon", suspended: true, under: [MOTIMON] }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          battleArea: [{ card: DUMMY, dp: 3000 }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => false, 50);

    // Digimon was suspended before and stays so — but it must not somehow unsuspend+attack.
    // The canActivate guard (isSuspended) blocks the effect.
    expect(s.perm("tentomon").isSuspended, "Tentomon stays suspended — attack not declared").toBe(true);
    // Confirm the card is still in seat 0's battle area (not moved by the effect).
    const permanentId = s.perm("tentomon").permanentId;
    const p0 = s.state.players[0];
    expect(p0?.battleArea.some((perm) => perm.permanentId === permanentId)).toBe(true);
  });

  it("does NOT trigger when the top card is not Insectoid", async () => {
    const s = setupEngine(
      {
        0: {
          // A non-Insectoid Digimon with BT15-004 in its stack.
          battleArea: [{ card: DUMMY, dp: 3000, as: "nonInsectoid", under: [MOTIMON] }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
        1: {
          battleArea: [{ card: DUMMY, dp: 2000 }],
          security: [
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
            { card: DUMMY, faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(s.perm("nonInsectoid").isSuspended).toBe(false);

    await fireTiming(s, EffectTiming.OnEndTurn);
    await settle(() => false, 50);

    // The canActivate guard (types must include "Insectoid") prevents the attack.
    expect(s.perm("nonInsectoid").isSuspended, "non-Insectoid must not be suspended").toBe(false);
  });

  it("allows only the first of two pending Motimon effects to declare an attack (KB Q2491)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: TENTOMON, dp: 4000, as: "first", under: [MOTIMON] },
            { card: TENTOMON, dp: 4000, as: "second", under: [MOTIMON] },
          ],
        },
        1: {
          battleArea: [
            { card: DUMMY, dp: 1000, as: "target1", suspended: true },
            { card: DUMMY, dp: 1000, as: "target2", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.OnEndTurn);

    expect([s.perm("first").isSuspended, s.perm("second").isSuspended].filter(Boolean)).toHaveLength(1);
  });
});
