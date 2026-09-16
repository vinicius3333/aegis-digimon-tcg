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

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

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

    const trashBeforeMove = s.state.players[0]!.trash.length;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.trash).toHaveLength(trashBeforeMove);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "P-095")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);

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
