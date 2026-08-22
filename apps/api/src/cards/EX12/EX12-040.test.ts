import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-040.js";

describe("EX12-040 Salamon", () => {
  it("reduces only a battle-area digivolution into a Holy Beast or VB Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-040", as: "source" }],
        hand: [{ card: "BT1-051", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-051");

    expect(s.state.memory).toBe(0);
  });

  it("does not reduce a non-Holy Beast and non-VB digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-040", as: "source" }],
        hand: [{ card: "BT1-053", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-053");

    expect(s.state.memory).toBe(-1);
  });

  it("does not trigger in the breeding area and inherits Barrier", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX12-040", as: "source" },
        hand: [{ card: "BT1-051", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-051");

    expect(s.state.memory).toBe(-1);
    expect(registeredCompiledCards.get("EX12-040")!.digivolutionRequirement).toEqual([
      { names: ["Nyaromon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);
    expect(registeredCompiledCards.get("EX12-040")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });

  it("binds the destination trait gate to the replacement, not the source", () => {
    const replacement = registeredCompiledCards
      .get("EX12-040")!
      .effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(replacement).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { nameOrTrait: [{ tokens: ["Holy Beast", "VB"], match: "trait" }] },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });
});
