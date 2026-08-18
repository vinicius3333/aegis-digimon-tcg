import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-095.js";

describe("BT10-095 Hero of the Skies!", () => {
  it("can choose Security Attack +1 without drawing when Shoutmon X5 is absent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-007", as: "target" }],
          hand: [{ card: "BT10-095", as: "option" }],
          deck: [{ card: "BT1-001", as: "top" }, "BT1-002"],
        },
      },
      { autoChooseOption: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(false);
  });

  it("can choose Draw 2 without granting Security Attack when Shoutmon X5 is absent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-007", as: "target" }],
          hand: [{ card: "BT10-095", as: "option" }],
          deck: [{ card: "BT1-001", as: "drawn1" }, { card: "BT1-002", as: "drawn2" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn2").instanceId));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("activates both effects instead of asking for a mode when Shoutmon X5 is present", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-013", as: "x5" }, { card: "BT10-007", as: "target" }],
          hand: [{ card: "BT10-095", as: "option" }],
          deck: [{ card: "BT1-001", as: "drawn1" }, { card: "BT1-002", as: "drawn2" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() =>
      observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1 &&
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn2").instanceId),
    );

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn2").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds itself to hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT10-095", as: "option", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
