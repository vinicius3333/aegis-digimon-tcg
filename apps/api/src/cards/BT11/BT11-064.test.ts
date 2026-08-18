import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-064.js";
import "./BT11-069.js";

describe("BT11-064 Greymon (X Antibody)", () => {
  it("reduces evolution into a dual-color Greymon-named card by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-064", as: "base" }],
        hand: [{ card: "BT11-069", as: "metalgreymon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalgreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-069");
    expect(s.state.memory).toBe(8); // printed cost 4 minus 2 colors
  });
});
