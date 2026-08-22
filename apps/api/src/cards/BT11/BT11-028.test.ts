import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-028.js";

describe("BT11-028 MachGaogamon", () => {
  it("gains Blocker and +2000 DP for every 4 cards in the opponent's hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-025", as: "base" }],
        hand: [{ card: "BT11-028", as: "mach" }],
        deck: ["BT1-001"],
      },
      1: { hand: Array.from({ length: 8 }, () => "BT1-001") },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("mach").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 11000);

    expect(s.perm("base").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });

  it("inherited effect unsuspends its host when an effect adds to the opponent's hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-033", as: "host", under: ["BT11-028"], suspended: true }] },
    });

    await advance(s.engine).fireSubTrigger("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: 1 });

    expect(s.perm("host").isSuspended).toBe(false);
  });
});
