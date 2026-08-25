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
});
