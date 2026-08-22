import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-022 Kamemon", () => {
  it("reveals three, adds one Shambala and one SW card, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-022", as: "source" }],
        deck: ["EX12-011", "EX12-012", "BT1-009"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-011") && s.state.players[0]!.hand.some((card) => card.cardId === "EX12-012"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-011", "EX12-012"]));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("leaves the deck unchanged when no revealed card matches either trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-022", as: "source" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]));
  });

  it("draws once from the inherited attack effect when the hand has seven or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-022"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("encodes the Shambala evolution, both independent reveal slots, and inherited Once Per Turn draw", () => {
    const compiled = registeredCompiledCards.get("EX12-022")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] }, count: 1, to: "hand" },
          { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["SW"], match: "trait" }] }, count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
