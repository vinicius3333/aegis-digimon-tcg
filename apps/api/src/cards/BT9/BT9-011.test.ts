import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT12/BT12-016.js";
import "../EX3/EX3-057.js";
import "./BT9-009.js";
import "./BT9-016.js";
import { compiled } from "./BT9-011.js";

describe("BT9-011 Growlmon (X Antibody)", () => {
  it("matches the catalog and complete inherited/evolution IR", () => {
    expect(getCardDefinition("BT9-011")).toMatchObject({
      cardId: "BT9-011",
      nameEn: "Growlmon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon", "X Antibody"],
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 1000 }],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Growlmon"], cost: 0, isAlternate: true }],
    });
  });

  it("uses the exact-name alternate route in a complete legal breeding chain", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [
          { card: "BT9-009", as: "guilmonX" },
          { card: "EX3-057", as: "growlmon" },
          { card: "BT9-011", as: "growlmonX" },
        ],
      },
    });
    s.state.memory = 2;
    for (const alias of ["guilmonX", "growlmon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("growlmonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT9-011");
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-001", "BT9-009", "EX3-057"]);
  });

  it("implements Q1801 on the same legal stack by raising a fixed 4000-DP deletion to 5000", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "egg" },
          hand: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "BT9-011", as: "growlmonX" },
            { card: "BT12-016", as: "warGrowlmon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "fiveThousand" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    for (const alias of ["guilmonX", "growlmonX", "warGrowlmon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.instanceId === s.inst(alias).instanceId);
    }
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toContain("BT9-011");
  });

  it("implements Q1802 by leaving 13000 DP outside a source-relative 12000-DP deletion", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "egg" },
          hand: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "BT9-011", as: "growlmonX" },
            { card: "BT12-016", as: "warGrowlmon" },
            { card: "BT9-016", as: "warGreymonX" },
          ],
        },
        1: { battleArea: [{ card: "BT13-032", as: "thirteenThousand" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;
    for (const alias of ["guilmonX", "growlmonX", "warGrowlmon", "warGreymonX"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("egg").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("egg").topCard.instanceId === s.inst(alias).instanceId);
    }
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
