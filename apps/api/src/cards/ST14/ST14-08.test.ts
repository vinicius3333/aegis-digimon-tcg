import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-08.js";

describe("ST14-08 Beelzemon", () => {
  it("mills 4, gains memory per 10 trash, and gains Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-08", as: "beel" }],
        trash: Array.from({ length: 6 }, () => "BT1-009"),
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("beel"));
    expect(s.state.players[0]!.trash).toHaveLength(10);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("beel"), "SecurityAttack")).toBe(1);
  });

  it("uses its All Turns once-per-turn memory trigger only once", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST14-08", as: "beel" }], trash: Array.from({ length: 10 }, () => "BT1-009") },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["mill-1"], byEffect: { ownerSeat: 0, isDigimonEffect: false } },
    });
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["mill-2"], byEffect: { ownerSeat: 0, isDigimonEffect: false } },
    });
    expect(s.state.memory).toBe(1);
  });

  it("scales the memory gain for every full 10 cards in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST14-08", as: "beel" }], trash: Array.from({ length: 20 }, () => "BT1-009") },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("onDiscardLibrary", {
      addedToHand: { instanceIds: ["mill"], byEffect: { ownerSeat: 0, isDigimonEffect: false } },
    });
    expect(s.state.memory).toBe(2);
  });
});
