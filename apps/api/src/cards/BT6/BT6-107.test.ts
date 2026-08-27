import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-107.js";

describe("BT6-107 Glaive Memory Boost!", () => {
  it("places itself in the battle area from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT6-107", as: "security", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT6-107")).toBe(true);
  });

  it("returns a purple Digimon from trash to hand and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT6-068"],
          hand: [{ card: "BT6-107", as: "option" }],
          trash: [{ card: "BT6-069", as: "returned" }],
        },
      },
      { autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const returnedId = s.inst("returned").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === returnedId)).toBe(true);
  });

  it("Delay trashes the placed Option and gains 2 memory on a later turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-068"], hand: [{ card: "BT6-107", as: "option" }], trash: ["BT6-069"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const optionId = s.inst("option").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === optionId,
    )!;
    s.state.turnCount += 1;
    s.state.memory = 3;
    await s.ready();
    const effects = observe(s.engine).activatableEffects(optionPermanent) as Array<{ effectKey: string }>;

    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: effects[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });
});
