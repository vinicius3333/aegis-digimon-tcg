import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-007.js";
describe("BT12-007 Guilmon", () => { it("adds every revealed Takato to hand", async () => { const s = setupEngine({ 0: { battleArea: [{ card: "BT12-007", as: "guilmon" }], deck: ["BT12-089", "BT1-009"] } }); await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("guilmon")); await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT12-089")); expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-089"); });

  it("does not boost a Guilmon host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-007", as: "host" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(2000);
  });
});
