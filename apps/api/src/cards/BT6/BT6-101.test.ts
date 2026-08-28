import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-101.js";

describe("BT6-101 Wyvern's Breath", () => {
  it("gives an opposing Digimon -15000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-031"], hand: [{ card: "BT6-101", as: "option" }] },
        1: { battleArea: [{ card: "BT6-044", as: "target", dp: 16000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);

    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-101", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-044", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const targetInstanceId = s.perm("target").topCard.instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
});
