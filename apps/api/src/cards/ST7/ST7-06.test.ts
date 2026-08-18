import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-06.js";

describe("ST7-06 GeoGreymon", () => {
  it("deletes an opposing Digimon with 4000 DP or less on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "ST7-06", as: "geo" }] }, 1: { battleArea: ["ST7-04"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geo").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
  });

  it("plays itself from security and resolves its On Play effect", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST7-06", as: "geo", faceUp: true }] }, 1: { battleArea: ["ST7-04"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("geo"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("geo").instanceId)).toBe(true);
  });
});
