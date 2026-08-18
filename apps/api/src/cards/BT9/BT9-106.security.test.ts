import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-106.js";

describe("BT9-106 DeathXDigivolution! — Security", () => {
  it("adds itself to its owner's hand", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT9-106", as: "option", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
