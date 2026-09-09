import { describe, expect, it } from "vitest";
import { Phase, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-003 Viximon", () => {
  it("returns exactly one Plug-In Option from trash at end of turn and leaves the non-Plug-In peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-030", as: "host", under: ["BT19-003"] }],
          trash: [
            { card: "BT1-102", as: "notPlugIn" },
            { card: "P-095", as: "plugInA" },
            { card: "P-095", as: "plugInB" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);
    await settle(() => (s.state.players[0] as PlayerState).hand.length === 1);

    const hand = (s.state.players[0] as PlayerState).hand;
    expect(hand).toHaveLength(1);
    expect(hand[0]!.cardId).toBe("P-095");
    expect((s.state.players[0] as PlayerState).trash.map((card) => card.cardId).sort()).toEqual(["BT1-102", "P-095"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("notPlugIn").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("carries the inherited return through the real Digi-Egg route and resets once per turn on the next own turn", async () => {
    // Peer/stack case, no injected timing. `hatchEgg` takes BT19-003 off the egg deck in the
    // production Breeding window, the Yellow Lv.3 BT1-045 digivolves onto it in the breeding
    // area (Lv.2 Yellow, cost 0), `moveFromBreeding` carries the stack into the battle area on
    // the next own turn, and the [End of Your Turn] inherited clause then fires from under the
    // real host at that turn's natural end — once that turn, and once more on the next own turn.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-003", as: "egg" }],
          hand: [
            { card: "BT1-045", as: "tsukaimon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-012", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
          trash: [
            { card: "BT1-102", as: "notPlugIn" },
            { card: "P-095", as: "plugInA" },
            { card: "P-095", as: "plugInB" },
          ],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-012", "BT1-014", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();

    // Turn 1 (seat 0): hatch the Digi-Egg through the production Breeding window.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    // Digivolve onto the egg inside the breeding area; the egg becomes the digivolution card.
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("tsukaimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-045");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    // Still in breeding: the inherited clause must not fire at this turn's end.
    const trashBeforeMove = s.state.players[0]!.trash.length;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.trash).toHaveLength(trashBeforeMove);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "P-095")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 3 (seat 0): move the raised stack into the battle area, then let the turn end.
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT1-045");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    const handBeforeTurnEnd = s.state.players[0]!.hand.map((card) => card.instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);

    // End of turn 3: exactly one Plug-In Option comes back; the non-Plug-In peer stays.
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "P-095"));
    await advance(s.engine).waitForMainPhase(1);
    const returnedFirst = s.state.players[0]!.hand.filter((card) => card.cardId === "P-095");
    expect(returnedFirst).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-102", "P-095"]);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("notPlugIn").instanceId)).toBe(
      true,
    );
    expect(handBeforeTurnEnd).not.toContain(returnedFirst[0]!.instanceId);
    advance(s.engine).endMainPhaseIfOpen(1);

    // Turn 5 (seat 0): the Once Per Turn guard has reset, so the second copy comes back.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "P-095")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.players[0]!.hand.filter((card) => card.cardId === "P-095").length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "P-095")).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-102"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
