import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-074.js";
import "../index.js";

describe("EX10-074 Beelzemon", () => {
  it("records the exact catalog, Blast Digivolve, scaling delete, and exact return cost", () => {
    expect(getCardDefinition("EX10-074")).toMatchObject({
      nameEn: "Beelzemon",
      colors: ["Purple", "Black"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      expect.objectContaining({
        level: 3,
        names: ["Impmon"],
        cost: 4,
        isAlternate: true,
        whileCondition: expect.objectContaining({ kind: "zoneCount", value: 20 }),
      }),
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(
        compiled.effects.find((effect) => effect.trigger === trigger && effect.actions.length === 2),
      ).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", amount: 2 },
          { kind: "Delete", playCostCeiling: { base: 6, raise: 3, per: 10, unit: "cards" } },
        ],
      });
    }
  });

  it("allows the Impmon alternate digivolution only with 20 or more cards in trash", async () => {
    const below = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "impmon" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(19).fill("BT1-001"),
      },
    });
    below.state.memory = 10;
    expect(
      below.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: below.perm("impmon").permanentId,
        instanceId: below.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });

    const enough = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "impmon" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(20).fill("BT1-001"),
        deck: ["BT1-009"],
      },
    });
    enough.state.memory = 10;
    expect(
      enough.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: enough.perm("impmon").permanentId,
        instanceId: enough.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => enough.perm("impmon").topCard.cardId === "EX10-074");
    expect(enough.perm("impmon").stack.map(({ cardId }) => cardId)).toContain("EX2-039");
  });

  it("counts the two newly milled cards before scaling the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(18).fill("BT1-001"),
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "AD1-004", as: "cost12" }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("cost12").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 20 &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === targetId),
    );

    expect(s.state.players[0]!.trash).toHaveLength(20);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("Q5190: returns exactly 2 non-Digi-Egg cards to the deck top to De-Digivolve 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: ["BT1-009", "BT1-010", ...Array(8).fill("BT1-001")],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-010");

    expect(s.perm("target").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT1-001")).toHaveLength(2);
  });

  it("Q5190 does not partially pay with one non-Digi-Egg among Digi-Egg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-074", as: "beelzemon" }],
          trash: ["BT1-009", ...Array(9).fill("BT1-001")],
        },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const before = s.perm("target").stack.map(({ instanceId }) => instanceId);
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("beelzemon"));
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual(before);
  });
});
