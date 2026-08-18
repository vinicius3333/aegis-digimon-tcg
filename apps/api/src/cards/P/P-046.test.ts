import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-107.js";
import "./P-036.js";
import "./P-046.js";

describe("P-046 Wizardmon", () => {
  it("gains 1 memory after the first Option used each turn, but not the second", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "host", under: ["P-046"] }],
          hand: [{ card: "BT2-107", as: "first" }, { card: "BT2-107", as: "second" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstId));
    await settle(() => s.state.memory === 10);
    expect(s.state.memory).toBe(10);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondId));
    await settle();
    expect(s.state.memory).toBe(9);
  });

  it("Q5519: does not trigger when a Delay effect activates without using an Option card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-081", as: "host", under: ["P-046"] },
          { card: "P-036", as: "delay" },
        ],
      },
    });
    const delay = s.perm("delay");
    delay.placedByEffect = true;
    delay.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 0;
    await s.ready();
    const entries = JSON.parse(delay.activatableEffectsJson || "[]") as Array<{ effectKey: string }>;

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: delay.topCard.instanceId,
      effectKey: entries[0]!.effectKey,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.state.memory).toBe(2);
  });

  it("Q5519: does not trigger when an Option's Security effect activates", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-081", as: "host", under: ["P-046"] }],
        security: [{ card: "P-036", as: "securityOption", faceUp: true }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("securityOption").instanceId,
    ));

    expect(s.state.memory).toBe(0);
  });
});
