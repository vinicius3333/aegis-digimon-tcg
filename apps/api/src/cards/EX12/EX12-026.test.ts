import { describe, expect, it } from "vitest";
import { CardKind, EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-026 Shellmon", () => {
  it("trashes the bottom two sources, then restricts the same eligible opponent from attacking and blocking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-026", as: "source" }] },
      1: {
        battleArea: [{ card: "EX12-024", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }],
      },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);

    const added = s.give(1, Zone.Hand, { card: "BT1-009", as: "added" });
    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [added.instanceId]);
    expect(s.perm("target").stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });

  it("applies the same trash-and-restrict sequence from When Digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-026", as: "source", under: ["BT1-009"] }] },
      1: { battleArea: [{ card: "EX12-024", as: "target", under: ["BT1-010", "BT1-011", "BT1-012"] }] },
    }, { autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "block"));
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-012"]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });

  it("has Blocker, gains the Aquatic Rule trait, and inherits once-per-turn Draw 1 at seven or fewer cards", async () => {
    const standalone = setupEngine({ 0: { battleArea: [{ card: "EX12-026", as: "source" }] } });
    await standalone.ready();
    expect(observe(standalone.engine).hasKeyword(standalone.perm("source"), "Blocker")).toBe(true);
    expect(observe(standalone.engine).hasEffectiveTrait(standalone.perm("source"), "Aquatic")).toBe(true);

    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-027", as: "host", under: ["EX12-026"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);
  });

  it("encodes the Shambala evolution, both trigger clauses, Rule trait, restrictions, and full coverage", () => {
    const compiled = registeredCompiledCards.get("EX12-026")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", amount: 2, fromTop: false, target: { count: 1, filter: { controller: "opponent", kind: [CardKind.Digimon] } } },
          { kind: "SelectBind", target: { bindAs: "restrictTarget", count: 1, filter: { digivolutionCardsAtMost: 1 } } },
          { kind: "Restrict", restriction: "attack", duration: "untilOpponentTurnEnd", target: { fromSelectionRef: "restrictTarget" } },
          { kind: "Restrict", restriction: "block", duration: "untilOpponentTurnEnd", target: { fromSelectionRef: "restrictTarget" } },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
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
