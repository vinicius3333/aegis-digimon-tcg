import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-004.js";

describe("BT11-004 Tanemon", () => {
  it("draws 1 when its controller plays a green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-004"] }],
        hand: [{ card: "BT1-088", as: "izzy" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("izzy").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-009"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});
