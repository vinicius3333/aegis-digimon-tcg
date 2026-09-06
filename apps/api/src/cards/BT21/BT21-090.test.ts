import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-090.js";
import "../BT17/BT17-030.js";
import "../BT17/BT17-086.js";
import "../index.js";

describe("BT21-090 The Strongest of Brothers", () => {
  it("keeps the Delay payload separate from the placement watcher", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onAddDigivolutionCards" });
    expect(allTurns[0]?.actions[0]).toMatchObject({
      sourceFilter: { controller: "mine", kind: ["Digimon"], byEffect: true },
    });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [expect.objectContaining({ kind: "RevealAdd" }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [
          expect.objectContaining({ kind: "PlayWithoutCost", optional: true }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("naturally gains Delay when an effect places a card under an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT17-086", as: "leon" },
            { card: "BT17-030", as: "pulsemon" },
          ],
          hand: [{ card: "BT21-090", as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));

    const [effect] = observe(s.engine).activatableEffects(s.perm("leon")) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("leon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").stack.some((card) => card.cardId === "BT17-086"));

    expect(observe(s.engine).hasKeyword(s.perm("option"), "Delay")).toBe(true);
  });

  it("reveals three cards, adds a Gammamon-text card, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "color" }],
          hand: [{ card: "BT21-090", as: "option" }],
          deck: ["BT21-010", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT21-010"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-090")).toBe(true);
  });

  it("Q4733 waives the color requirement for a Gammamon-text card in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-069", as: "gulus" },
        hand: [{ card: "BT21-090", as: "option" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-090"));
    expect(s.state.memory).toBe(0);
  });

  it("does not waive the color requirement without a Gammamon-text card on the field", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT21-090", as: "option" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("Security may play a cost-4 Gammamon-text card from trash, then places itself", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT21-090", as: "option" }],
          trash: [{ card: "BT21-010", as: "gammamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["BT21-010", "BT21-090"]),
    );
    expect(s.state.memory).toBe(0);
  });
});
