import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT1/BT1-010.js";
import "../cards/BT1/BT1-028.js";
import "../cards/BT15/BT15-090.js";

/**
 * Playing an Option whose [Main] returns an opposing permanent to the hand.
 *
 * Three BT17 lanes reported this path as an engine defect: the Option "leaves the hand and spends
 * memory but never returns the target, and the card ends in no zone". It is not a defect — the
 * whole play resolves through `GameEngine.continueMainVerb`, a promise chain with no timer
 * boundary, so an ordinary `settle` reaches its endpoint. The two ways the reported symptom is
 * actually produced are a rejected declaration (an Option needs a matching-colour Digimon or Tamer
 * on the field, comprehensive.md §4-22-2 — without one `playCard` answers `color-requirement-unmet`
 * and nothing moves) and a `settle` whose tick budget was passed as an object rather than the
 * positional number the harness takes, which polls zero times and reads the pre-resolution board.
 *
 * This test pins the real endpoint so the path cannot silently regress into the reported shape.
 */
describe("playing an Option that returns a permanent to the hand", () => {
  it("returns the target, trashes the used Option and charges its cost", async () => {
    const s = setupEngine(
      {
        0: {
          // BT15-090 Fox Fire is blue; a blue Digimon on the field meets its colour requirement.
          hand: [{ card: "BT15-090", as: "foxFire" }],
          battleArea: [{ card: "BT1-028", as: "blueDigimon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "victim" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const foxFireId = s.inst("foxFire").instanceId;
    const victimId = s.inst("victim").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: foxFireId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === victimId));

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([victimId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // The used Option ends in its owner's trash, not in the no-zone `resolvingOption` slot.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([foxFireId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the declaration with no matching-colour Digimon, moving and charging nothing", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-090", as: "foxFire" }] },
        1: { battleArea: [{ card: "BT1-010", as: "victim" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const foxFireId = s.inst("foxFire").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: foxFireId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([foxFireId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(10);
  });
});
