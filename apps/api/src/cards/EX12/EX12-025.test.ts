import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-025 Gawappamon", () => {
  it("optionally returns one opposing level 4 or lower Digimon on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-025", as: "source" }] },
      1: { battleArea: [{ card: "EX12-024", as: "low" }, { card: "EX12-026", as: "high" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("EX12-026");
  });

  it("does not return a target when the optional On Play effect is declined", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-025", as: "source" }] },
      1: { battleArea: [{ card: "EX12-024", as: "target" }] },
    }, { autoDeclineOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("optionally returns one opposing level 4 or lower Digimon on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-025", as: "source" }] },
      1: { battleArea: [{ card: "EX12-024", as: "low" }, { card: "EX12-026", as: "high" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("EX12-026");
  });

  it("has Blocker, the Shambala evolution route, and inherited once-per-turn Draw 1 at seven or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-026", as: "host", under: ["EX12-025"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010", "BT1-011"],
      },
    }, { autoSelectCards: true });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);

    const compiled = registeredCompiledCards.get("EX12-025")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
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
