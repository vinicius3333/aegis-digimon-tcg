import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const CARD_ID = "EX12-061";

describe("EX12-061 Hanimon", () => {
  it("maps the Shambala evolution, Puppet/TB payment, and inherited Once Per Turn effect", () => {
    const compiled = registeredCompiledCards.get(CARD_ID)!;

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Puppet", "TB"], match: "trait" }],
              },
            },
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      ],
    });
  });

  it("trashes a Puppet/TB card from hand and draws two on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-062", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.trash.some((card) => card.instanceId === s.inst("cost").instanceId) &&
        player.hand.some((card) => card.cardId === "BT1-010"),
    );

    expect(player.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("does not draw when no Puppet/TB payment is available", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "source" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));

    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("draws and trashes once from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-062", as: "host", under: [CARD_ID] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => player.deck.length === 0 && player.trash.length === 1);

    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-010")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });
});
