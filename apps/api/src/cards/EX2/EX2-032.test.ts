import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-032.js";

describe("EX2-032 Strikedramon", () => {
  it("adds a black Tamer from the top four when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-030", as: "base" }],
          hand: [{ card: "EX2-032", as: "evolution" }],
          deck: [{ card: "EX2-062", as: "tamer" }, "BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });
});
