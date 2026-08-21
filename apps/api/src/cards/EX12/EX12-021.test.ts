import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-021 Gabumon", () => {
  it("trashes a matching hand card, draws one, and gains one memory at start of main", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-021", as: "source" }],
        hand: [{ card: "EX12-007", as: "cost" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("does not resolve the combined effect without a matching hand cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-021", as: "source" }],
        hand: ["BT1-009"],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
  });

  it("draws once from the inherited attack effect when the hand has seven or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-021"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    }, { autoAcceptOptional: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("does not draw from the inherited effect when the hand starts above seven cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-021"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("encodes both zero-cost evolution routes, the exact hand cost filter, and inherited Once Per Turn draw", () => {
    const compiled = registeredCompiledCards.get("EX12-021")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }, { tokens: ["VB"], match: "trait" }] },
            },
          },
        },
        { kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectActed" } },
      ],
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
