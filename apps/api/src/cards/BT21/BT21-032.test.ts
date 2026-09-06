import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-032.js";
import "../index.js";

describe("BT21-032 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("reduces Armor Form/Hero evolution costs and grants inherited +2000 DP", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldDigivolve",
            sourceFilter: { isSelfRef: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Armor Form", "Hero"], match: "trait" }],
            },
            actions: [
              {
                kind: "Replacement",
                event: "wouldDigivolve",
                mode: "reduceCost",
                amount: 1,
                raw: "reduce the digivolution cost by 1",
              },
            ],
          },
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["DemiVeemon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["Hero"], cost: 0, isAlternate: true },
    ]);
  });

  it.each([
    { base: "BT12-002", route: "DemiVeemon" },
    { base: "BT21-002", route: "level-2 Hero" },
  ])("evolves from the $route alternate requirement for 0", async ({ base }) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "BT21-032", as: "veemon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: base === "BT12-002" ? 0 : 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT21-032");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
  });

  it.each([
    { trait: "Armor Form", target: "BT21-035", printedCost: 3 },
    { trait: "Hero", target: "BT21-013", printedCost: 2 },
  ])("reduces a $trait evolution by exactly 1", async ({ target, printedCost }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-032", as: "veemon" }],
        hand: [{ card: target, as: "evolution" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === target);

    expect(s.state.memory).toBe(4 - (printedCost - 1));
  });

  it("rejects both zero-cost alternate routes from a non-DemiVeemon, non-Hero base", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT21-032", as: "veemon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("BT1-003");
  });

  it("does not reduce a near-matching evolution or apply the reduction in breeding", async () => {
    for (const zone of ["battleArea", "breeding"] as const) {
      const s = setupEngine({
        0: {
          ...(zone === "battleArea"
            ? { battleArea: [{ card: "BT21-032", as: "veemon" }] }
            : { breeding: { card: "BT21-032", as: "veemon" } }),
          hand: [{ card: zone === "battleArea" ? "BT21-034" : "BT21-035", as: "evolution" }],
        },
      });
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("veemon").permanentId,
          instanceId: s.inst("evolution").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("veemon").topCard.instanceId === s.inst("evolution").instanceId);

      expect(s.state.memory).toBe(zone === "battleArea" ? 2 : 1);
    }
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    for (const turnSeat of [0, 1] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT21-035", as: "host", under: ["BT21-032"] }] },
      });
      s.state.turnSeat = turnSeat;
      await s.ready();

      expect(s.perm("host").currentDP).toBe(turnSeat === 0 ? 8000 : 6000);
    }
  });
});
