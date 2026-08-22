import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-091.js";

describe("BT11-091 Taiga", () => {
  it("gives all own Digimon +1000 DP and suspends to reduce a green level-5+ evolution by 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-091", as: "taiga" },
          { card: "BT1-075", as: "base", dp: 5000 },
        ],
        hand: [{ card: "BT1-083", as: "target" }],
      },
    }, { autoAcceptOptional: true });
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("base").currentDP).toBe(6000);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-083");
    expect(s.state.memory).toBe(7); // printed 4 reduced to 3
    expect(s.perm("taiga").isSuspended).toBe(true);
  });
});
