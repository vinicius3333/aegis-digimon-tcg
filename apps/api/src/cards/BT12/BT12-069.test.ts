import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-069.js";

describe("BT12-069 Footmon", () => {
  it("has no printed effects and keeps its card definition", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT12-069", as: "foot" }] } });
    expect(s.state.players[0]!.hand.find(({ instanceId }) => instanceId === s.inst("foot").instanceId)?.cardId).toBe(
      "BT12-069",
    );
    expect(getEffectModule("BT12-069")?.cardId).toBe("BT12-069");
  });
});
