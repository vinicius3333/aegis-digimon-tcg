import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-035.js";

describe("BT5-035 Starmons", () => {
  it("gives -1000 DP for each own Digimon in play, including itself", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-035", as: "source" }], battleArea: [
      { card: "BT5-034", as: "ally" },
    ] }, 1: { battleArea: [{ card: "BT5-041", as: "target", dp: 7000 }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
  });
});
