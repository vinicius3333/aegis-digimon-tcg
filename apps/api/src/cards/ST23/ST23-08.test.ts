import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-08.js";

describe("ST23-08 Murasamemon", () => {
  it("gains 3000 DP when digivolving until the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-07", as: "base" }], hand: [{ card: "ST23-08", as: "murasamemon" }], deck: ["BT1-002"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("murasamemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST23-08" && s.perm("base").currentDP === 10000);
    expect(s.perm("base").topCard?.cardId).toBe("ST23-08");
    expect(s.perm("base").currentDP).toBe(10000);
  });
});
