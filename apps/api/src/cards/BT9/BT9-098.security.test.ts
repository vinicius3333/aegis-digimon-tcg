import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-098.js";

describe("BT9-098 Awakening of the Golden Knight — Security", () => {
  it("returns a Magnamon from trash and adds itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT9-098", as: "option", faceUp: true }], trash: [{ card: "BT8-038", as: "magna" }] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("magna").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
