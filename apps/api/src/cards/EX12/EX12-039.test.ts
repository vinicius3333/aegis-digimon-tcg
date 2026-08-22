import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-039.js";

describe("EX12-039 Takinmon", () => {
  it("reduces only a battle-area digivolution into an SW Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-039", as: "source" }],
        hand: [{ card: "EX12-043", as: "target" }],
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
    await settle(() => s.perm("source").topCard?.cardId === "EX12-043");

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").topCard?.cardId).toBe("EX12-043");
  });

  it("does not reduce a non-SW digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-039", as: "source" }],
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

    expect(s.state.memory).toBe(-1);
  });

  it("does not trigger in the breeding area and inherits Barrier", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX12-039", as: "source" },
        hand: [{ card: "EX12-043", as: "target" }],
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
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-043");

    expect(s.state.memory).toBe(-1);
    expect(registeredCompiledCards.get("EX12-039")!.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);
    expect(registeredCompiledCards.get("EX12-039")!.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
  });
});
