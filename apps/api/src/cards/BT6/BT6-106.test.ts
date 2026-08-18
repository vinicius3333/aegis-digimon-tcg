import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-106.js";

describe("BT6-106 Iron-Fisted Onslaught", () => {
  it("deletes all opposing Digimon with highest play cost", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT6-055"], hand: [{ card: "BT6-106", as: "option" }] },
      1: { battleArea: ["BT6-056", "BT6-057"] },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length < 2);

    expect(s.state.players[1]!.battleArea.length).toBeLessThan(2);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT6-106", as: "security", faceUp: true }] },
      1: { battleArea: [{ card: "BT6-056", as: "low" }, { card: "BT6-057", as: "high" }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
