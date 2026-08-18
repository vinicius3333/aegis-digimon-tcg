import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-021.js";

describe("EX2-021 Kyubimon", () => {
  it("adds a Plug-In Option from the top three when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-019", as: "base" }], hand: [{ card: "EX2-021", as: "evolution" }], deck: [{ card: "EX2-066", as: "plugin" }, "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolution").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("plugin").instanceId)).toBe(true);
  });
});
