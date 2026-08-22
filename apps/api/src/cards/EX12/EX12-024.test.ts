import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-024 Garurumon", () => {
  it("returns one opposing level 4 or lower Digimon on play and shares the once-per-turn limit with attacking", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX12-024", as: "source" }] },
      1: { battleArea: [{ card: "EX12-024", as: "first" }, { card: "EX12-025", as: "second" }, { card: "EX12-026", as: "high" }] },
    }, { autoSelectCards: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 1);
    await settle();
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    const source = s.state.players[0]!.battleArea[0]!;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("returns an opposing level 4 or lower Digimon when attacking if the shared limit is unused", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-024", as: "source" }] },
      1: { battleArea: [{ card: "EX12-024", as: "first" }, { card: "EX12-025", as: "second" }, { card: "EX12-026", as: "high" }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("inherits once-per-turn Draw 1 and trash 1 card from hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-025", as: "host", under: ["EX12-024"] }],
        hand: ["BT1-009"],
        deck: ["BT1-010"],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("has Jamming and both printed zero-cost alternate evolution routes", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-024", as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);

    const compiled = registeredCompiledCards.get("EX12-024")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSo", "VB"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [{ kind: "Return", to: "hand", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 } }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && !effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
