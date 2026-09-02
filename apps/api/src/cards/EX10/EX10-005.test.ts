import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-005.js";

describe("EX10-005 Pagumon", () => {
  it("draws once when an opponent deck card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
        deck: ["BT1-009"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: [], byEffect: { ownerSeat: 1, isDigimonEffect: true } },
    });
    await settle(() => s.state.players[0]!.hand.length === before + 1);
    expect(s.state.players[0]!.hand.length).toBe(before + 1);
  });

  it("only reacts to the opponent deck and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
        deck: ["BT1-009"],
      },
    });
    await s.engine.recomputeContinuousEffects();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["own-mill"], byEffect: { ownerSeat: 0, isDigimonEffect: true } },
    });
    expect(s.state.players[0]!.hand.length).toBe(before);

    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["opponent-mill-1"], byEffect: { ownerSeat: 1, isDigimonEffect: true } },
    });
    await settle(() => s.state.players[0]!.hand.length === before + 1);
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["opponent-mill-2"], byEffect: { ownerSeat: 1, isDigimonEffect: true } },
    });
    await settle(() => s.state.players[0]!.hand.length === before + 1);
    expect(s.state.players[0]!.hand.length).toBe(before + 1);

    expect(compiled.effects?.find((e) => e.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: { controller: "opponent" },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("does not draw on the opponent's turn ([Your Turn] window)", async () => {
    // FAILS-WHEN-REVERTED: widening the effect to AllTurns lets the mill draw on either turn.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
        deck: ["BT1-009"],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["opponent-mill"], byEffect: { ownerSeat: 1, isDigimonEffect: true } },
    });
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand.length).toBe(before);
  });

  it("draws when a real deck-trash effect mills the opponent's deck (no synthetic payload)", async () => {
    // EX10-009's [On Deletion] "trash their deck's top 5 cards" is a genuine TrashTopDeck, which
    // reveals, trashes, and calls `fireOnDiscardLibrary` from the production seam. Nothing here
    // fabricates a trigger payload. FAILS-WHEN-REVERTED: drop the SubTrigger consumer from
    // EX10-005 and no card is drawn even though the opponent's deck loses 5.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] },
          { card: "EX10-009", as: "creepymon" },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"] },
    });
    await s.engine.recomputeContinuousEffects();
    const handBefore = s.state.players[0]!.hand.length;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("creepymon").permanentId])).toBe(1);
    await settle(() => s.state.players[1]!.trash.length === 5 && s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });
});
