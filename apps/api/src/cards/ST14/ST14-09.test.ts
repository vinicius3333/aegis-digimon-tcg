import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-09.js";

describe("ST14-09 BeelStarmon", () => {
  it("reduces its play cost by 4 per 10 cards in trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST14-09", as: "beelstar" }],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelstar").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(1);
  });

  it("plays an Impmon from trash with Rush when its deck is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST14-09", as: "beelstar" }],
          trash: [{ card: "ST14-02", as: "impmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: [], byEffect: { ownerSeat: 0, isDigimonEffect: true } },
    });
    const impmon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "ST14-02");
    expect(impmon).toBeDefined();
    expect(observe(s.engine).hasKeyword(impmon!, "Rush")).toBe(true);
  });
});
