import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-099.js";

describe("BT6-099 Acid Injection", () => {
  it("trashes security and reduces an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-031"], security: ["BT6-032"], hand: [{ card: "BT6-099", as: "option" }] },
        1: { battleArea: [{ card: "BT6-033", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 0 && s.perm("target").currentDP < 4000);

    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-099", as: "security", faceUp: true }] } });
    const instanceId = s.inst("security").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === instanceId)).toBe(true);
  });
});
