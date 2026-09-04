import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-070.js";

describe("EX4-070 Tarnished Hero", () => {
  it("deletes an opposing level three Digimon and places itself in the battle area", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
  it("has Delay and makes the opponent choose between trashing an Option and its controller gaining memory", () => {
    const delay = compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions).toMatchObject([
      { kind: "Trash", controller: "opponent", target: { filter: { zone: "hand", kind: ["Option"] } } },
      { kind: "GainMemory", amount: 2, condition: { kind: "ifThisEffectDidNotAct" } },
    ]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-070");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("places itself when no level-three target exists and gains memory when Delay has no Option to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "green" }],
          hand: [{ card: "EX4-070", as: "option" }],
        },
        1: { battleArea: [{ card: "AD1-025", as: "onlyTarget" }], hand: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "AD1-025")).toBe(true);

    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === optionId,
    )!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();
    const delay = observe(s.engine).activatableEffects(optionPermanent) as Array<{ effectKey: string }>;
    expect(delay).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: delay[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId) && s.state.memory === 4);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("trashes an opponent Option through Delay without granting memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "green" }],
          hand: [{ card: "EX4-070", as: "option" }],
        },
        1: { battleArea: [{ card: "AD1-025", as: "onlyTarget" }], hand: [{ card: "BT1-093", as: "opponentOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const optionPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === optionId,
    )!;
    optionPermanent.enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 2;
    await s.engine.recomputeContinuousEffects();
    const delay = observe(s.engine).activatableEffects(optionPermanent) as Array<{ effectKey: string }>;
    expect(delay).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: optionId, effectKey: delay[0]!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentOption").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentOption").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(2);
  });

  ex4CardBehaviorTests("EX4-070");
});
