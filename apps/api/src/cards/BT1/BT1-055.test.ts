import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-055.js";

describe("BT1-055 Angemon", () => {
  it("gives one opponent Digimon -3000 DP for the turn", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-055", as: "angemon" }] },
      1: { battleArea: [{ card: "BT1-070", as: "target", dp: 6000 }] },
    }, { autoSelectCards: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });
});
