import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-035.js";

describe("BT7-035 Kazemon", () => {
  it("digivolves from hand onto a yellow Tamer for 2 memory and draws the bonus", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-087", as: "tamer" }],
        hand: [{ card: "BT7-035", as: "kazemon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("kazemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-035" && s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").topCard?.cardId).toBe("BT7-035");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
