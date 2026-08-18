import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-100.js";

describe("BT10-100 Impulse Memory Boost!", () => {
  it("may play Pulsemon for free, then places itself in the battle area", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT10-029"],
        hand: [{ card: "BT10-100", as: "option" }, { card: "BT10-031", as: "pulsemon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const optionId = s.inst("option").instanceId;
    const pulsemonId = s.inst("pulsemon").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === pulsemonId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("still places itself when its optional Pulsemon play is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT10-029"],
        hand: [{ card: "BT10-100", as: "option" }, { card: "BT10-031", as: "pulsemon" }],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true });
    const optionId = s.inst("option").instanceId;
    const pulsemonId = s.inst("pulsemon").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === pulsemonId)).toBe(true);
  });

  it("places itself even when no Pulsemon is available", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT10-029"], hand: [{ card: "BT10-100", as: "option" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));
  });

  it("Delay trashes itself and gains 2 memory on a later turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-100", as: "option" }] } });
    const optionId = s.perm("option").topCard.instanceId;
    s.state.turnCount += 1;
    s.state.memory = 2;
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("option")) as Array<{ effectKey: string }>;

    expect(effects).toHaveLength(1);
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: optionId,
      effectKey: effects[0]!.effectKey,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("Security places itself in the battle area", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT10-100", as: "option", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
