import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-023 Jellymon", () => {
  it("reveals three, adds Jellymon-text and DS cards, and bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-023", as: "source" }],
        deck: ["EX12-023", "EX12-027", "BT1-009"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-023") && s.state.players[0]!.hand.some((card) => card.cardId === "EX12-027"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-023", "EX12-027"]));
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("draws then trashes one card when the post-draw hand reaches seven", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-023"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("draws but does not trash when the post-draw hand remains below seven", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-023"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 6);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("encodes both zero-cost evolution routes, both reveal slots, and the post-draw hand threshold", () => {
    const compiled = registeredCompiledCards.get("EX12-023")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Puyoyomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["DS"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        add: [
          { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }] }, count: 1, to: "hand" },
          { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["DS"], match: "trait" }] }, count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 }, condition: { kind: "handAtLeast", value: 7 } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
