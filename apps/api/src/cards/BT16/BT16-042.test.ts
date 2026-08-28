import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-042.js";
import "../index.js";

describe("BT16-042", () => {
  it("grants itself the Insectoid trait", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Insectoid"] }],
    });
  });

  it("grants 3000 DP on play or digivolution and inherited suspended DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("boosts an own Digimon on play and grants the rule Insectoid trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-042", as: "blade" }],
          battleArea: [{ card: "BT1-009", as: "ally", dp: 3000 }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blade").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("ally").currentDP === 6000);

    expect(s.perm("ally").currentDP).toBe(6000);
    expect(s.perm("opponent").currentDP).toBe(3000);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("blade"), "Insectoid")).toBe(true);
  });

  it("boosts the evolving Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-041", as: "base", dp: 4000 }], hand: [{ card: "BT16-042", as: "blade" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blade").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT16-042");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(7000);
  });

  it("applies the inherited bonus while a stacked host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-041", as: "host", dp: 4000, under: ["BT16-042"], suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(5000);
  });
});
