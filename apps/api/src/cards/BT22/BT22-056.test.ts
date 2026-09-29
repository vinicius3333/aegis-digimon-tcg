import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-056.js";
import "./index.js";

describe("BT22-056 Guardromon", () => {
  it("reduces one opponent Digimon and conditionally De-Digivolves another", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, colors: ["Black"], cost: 3, isAlternate: false },
      { level: 3, colors: ["Yellow"], cost: 3, isAlternate: false },
      { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        condition: { kind: "stackHasSameLevelCards", count: 2 },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("retains inherited opponent-turn +2000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("uses two same-level source cards to unlock De-Digivolve after a CS evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-069", as: "base" }],
          hand: [
            { card: "BT22-053", as: "sameLevel" },
            { card: "BT22-056", as: "guardromon" },
          ],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-021"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [s.inst("sameLevel").instanceId]);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-021");

    expect(s.state.memory).toBe(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-021");
  });

  it("still applies -3000 DP but does not De-Digivolve without a repeated level", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT22-056", as: "guardromon" }] },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guardromon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("target").topCard?.cardId).toBe("BT22-071");
    expect(s.perm("target").currentDP).toBe(3000);
  });
});

describe("BT22-056 Guardromon — KB Q&A rulings", () => {
  async function digivolveGuardromonOver(baseSources: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-069", as: "base", under: baseSources }],
          hand: [{ card: "BT22-056", as: "guardromon" }],
        },
        1: { battleArea: [{ card: "BT22-071", as: "target", under: ["BT1-021"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    return s;
  }

  it("counts the top card as one of the same-level cards in the stack (Q4908)", async () => {
    const withLevel4Source = await digivolveGuardromonOver(["BT22-071"]);
    expect(withLevel4Source.perm("target").topCard?.cardId).toBe("BT1-021");

    const withTwoLevel3Sources = await digivolveGuardromonOver(["BT22-053"]);
    expect(withTwoLevel3Sources.perm("target").topCard?.cardId).toBe("BT1-021");

    const withoutRepeatedLevel = await digivolveGuardromonOver(["BT1-021"]);
    expect(withoutRepeatedLevel.perm("target").topCard?.cardId).toBe("BT22-071");
  });

  it("does not delete a Digimon at 0 DP until the whole effect resolves (Q4909)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-069", as: "base", under: ["BT22-053"] }],
          hand: [{ card: "BT22-056", as: "guardromon" }],
        },
        1: { battleArea: [{ card: "BT2-056", as: "target", under: ["BT1-021"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guardromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    const survivor = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.permanentId === s.perm("target").permanentId,
    );
    expect(survivor?.topCard?.cardId).toBe("BT1-021");
    expect(survivor?.currentDP).toBe(4000);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT2-056"]);

    const control = setupEngine(
      {
        0: { hand: [{ card: "BT22-056", as: "guardromon" }] },
        1: { battleArea: [{ card: "BT2-056", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    control.state.memory = 5;
    expect(
      control.engine.applyIntent(0, { type: "playCard", instanceId: control.inst("guardromon").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(control.state.players[1]!.battleArea).toHaveLength(0);
    expect(control.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT2-056"]);
  });
});
