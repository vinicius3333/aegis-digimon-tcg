import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-109.js";

describe("BT6-109 Fly Bullet", () => {
  it("deletes an opposing level 6 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-017"], hand: [{ card: "BT6-109", as: "option" }] },
        1: { battleArea: ["BT6-070"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-109", as: "security", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-070", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
