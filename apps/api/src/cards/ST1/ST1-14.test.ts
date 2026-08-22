import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST1-14.js";

describe("ST1-14 Starlight Explosion", () => {
  it("registers both security DP durations as complete IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Main", actions: [{ kind: "ModifySecurityDP", amount: 7000, duration: "untilOpponentTurnEnd" }] },
        {
          trigger: "Security",
          isSecurity: true,
          actions: [{ kind: "ModifySecurityDP", amount: 7000, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("gives your Security Digimon +7000 DP from Main", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST1-03"], hand: [{ card: "ST1-14", as: "option" }], deck: ["BT1-001"] },
      1: { deck: ["BT1-001"] },
    });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).securityDp(0) === 7000);
    expect(observe(s.engine).securityDp(0)).toBe(7000);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).securityDp(0)).toBe(7000);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("gives your Security Digimon +7000 DP from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST1-14", as: "securityOption", faceUp: true }], deck: ["BT1-001"] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).securityDp(0)).toBe(7000);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });
});
