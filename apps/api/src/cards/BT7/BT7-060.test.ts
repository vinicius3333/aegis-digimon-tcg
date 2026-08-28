import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-060.js";

describe("BT7-060 Grumblemon", () => {
  it("digivolves from hand onto a black Tamer for 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-089", as: "tamer" }],
        hand: [{ card: "BT7-060", as: "grumble" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("grumble").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-060" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-060");
  });
});
