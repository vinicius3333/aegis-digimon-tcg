import { describe, it, expect } from "vitest";
import { type PlayerState, EffectTiming, type Seat } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for the ＜Delay＞ activation subsystem, proven on LM-033 (Garnet Memory Boost!).
// documented behavior (documented behavior): the [Main] effect reveals + adds, then places this card as a battle-area
// OPTION PERMANENT (PlaceDelayOptionCards = CanPlayAsNewPermanent isPlayOption). The "[Main]
// <Delay> Gain 2 memory" is EffectTiming.OnDeclaration: an activatable that deletes this option
// permanent (the cost) then gains 2 memory, gated by CanDeclareOptionDelayEffect
// (EnterFieldTurnCount != current TurnCount — can't activate the turn it enters).
//
// This proves the universal subsystem:
//   1. The <Delay> payload does NOT fire on play (was an immediate-[Main] bug).
//   2. It can't be activated the turn the option entered (notEnteredThisTurn gate).
//   3. On a later turn it activates: the option is trashed (cost) and 2 memory is gained.
//
// FAILS-WHEN-REVERTED: routing the Delay clause back to OnUseOption (timingForTrigger) makes it
// fire on play (memory after play = 2, test 1 RED). Dropping the enterFieldTurnCount gate lets it
// activate the same turn (test 2 RED). Dropping the delete-self cost leaves the option on the
// board after activation (test 3 RED).

// LM-033's OnDeclaration bucket holds ONLY the ＜Delay＞ payload (index 0). The plain [Main] body
// is an Option's on-play effect — it lives solely at OnUseOption and is NOT re-exposed at
// OnDeclaration (which would let the play effect re-fire on the placed option permanent).
const DELAY_KEY = `LM-033/ir-${EffectTiming.OnDeclaration}-0`;

function setupGarnet(): EngineSetup {
  return setupEngine(
    {
      0: {
        // §4-21 color-requirement source (Red). Not itself under test, so it stays established.
        battleArea: [{ card: "BT1-009", as: "colorSource" }],
        hand: [{ card: "LM-033", as: "option" }],
        // Deck top-3 = the reveal-add candidates: BT1-009 (red, the add target), BT1-045, BT1-064.
        deck: ["BT1-009", "BT1-045", "BT1-064"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
}

function playGarnet(s: EngineSetup): { instanceId: string } {
  s.state.memory = 3;
  const option = s.inst("option");
  expect(s.engine.applyIntent(0 as Seat, { type: "playCard", instanceId: option.instanceId })).toEqual({
    ok: true,
  });
  return { instanceId: option.instanceId };
}

describe("LM-033 ＜Delay＞ activation subsystem", () => {
  it("does NOT gain memory on play (the delay payload is no longer an immediate [Main])", async () => {
    const s = setupGarnet();
    const p0 = s.state.players[0] as PlayerState;
    playGarnet(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"));
    await settle(() => false, 60); // flush the rest of the resolution

    expect(p0.hand.some((c) => c.cardId === "BT1-009")).toBe(true); // reveal-add still works
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true); // placed as permanent
    expect(s.state.memory).toBe(0); // cost 3 paid, NO immediate +2
  });

  it("cannot be activated the turn the option entered, but DOES on a later turn (trash + gain 2)", async () => {
    const s = setupGarnet();
    const p0 = s.state.players[0] as PlayerState;
    playGarnet(s);
    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"));
    await settle(() => false, 60); // flush the rest of the resolution
    const perm = p0.battleArea.find((p) => p.topCard?.cardId === "LM-033")!;
    const optionInstanceId = perm.topCard!.instanceId;

    // Same turn (turnCount unchanged): the notEnteredThisTurn gate blocks the activation —
    // assert the OBSERVABLES (no memory gained, option still on board), independent of the
    // intent-accepted return value.
    s.engine.applyIntent(0 as Seat, {
      type: "activateEffect",
      sourceInstanceId: optionInstanceId,
      effectKey: DELAY_KEY,
    });
    await settle(() => false, 60);
    expect(s.state.memory).toBe(0); // no gain same turn
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "LM-033")).toBe(true); // still on board

    // A later turn: the gate passes.
    s.state.turnCount += 1;
    expect(
      s.engine.applyIntent(0 as Seat, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: DELAY_KEY,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(2); // gained 2 memory
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "LM-033")).toBe(false); // option trashed (cost)
    expect(p0.trash.some((c) => c.cardId === "LM-033")).toBe(true);
  });
});
