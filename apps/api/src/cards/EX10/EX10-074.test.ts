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

  it("Q5191: ＜Blast Digivolve＞ from hand at counter timing over the 20-trash Impmon path", async () => {
    // The counter window is the defender's (seat 1). ＜Blast Digivolve＞ waives the memory cost
    // but NOT the digivolution requirement, so the only legal base here is the Lv.3 Impmon
    // reached through the alternate `[Digivolve] While you have 20 or more cards in trash` path.
    // FAILS-WHEN-REVERTED: drop the Counter/BlastDigivolve marker effect and
    // `hasBlastDigivolveKeyword` goes false, so the card is never an eligible counter.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX2-039", as: "impmon" }],
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(20).fill("BT1-001"),
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "counterWindowOpened"));

    const opened = s.events.find(({ kind }) => kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find(({ instanceId }) => instanceId === s.inst("beelzemon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("impmon").topCard.cardId === "EX10-074");

    expect(s.perm("impmon").topCard.cardId).toBe("EX10-074");
    expect(s.perm("impmon").stack.map(({ cardId }) => cardId)).toContain("EX2-039");
    // The blast waived the cost outright: no memory changed hands.
    expect(s.state.memory).toBe(0);
  });

  it("Q5191 negative: 19 cards in trash leaves the Impmon base illegal even for the blast", async () => {
    // ＜Blast Digivolve＞ waives the COST, never the requirement. One card short of 20 and the
    // alternate Lv.3 [Impmon] path is closed, so no legal base exists for this counter.
    // FAILS-WHEN-REVERTED: drop `whileCondition` (or loosen its value) and the counter becomes
    // usable one card early.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "EX2-039", as: "impmon" }],
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(19).fill("BT1-001"),
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // With no eligible counter the engine skips the window entirely (§11-3), so the absence of
    // `counterWindowOpened` is itself proof the blast path is closed. Tolerate both shapes.
    await settle(() => false, 60);

    const opened = s.events.find(({ kind }) => kind === "counterWindowOpened");
    const eligible =
      opened?.kind === "counterWindowOpened"
        ? opened.eligibleCounters.find(({ instanceId }) => instanceId === s.inst("beelzemon").instanceId)
        : undefined;
    expect(eligible).toBeUndefined();

    const responded =
      eligible === undefined
        ? undefined
        : s.engine.applyIntent(1, {
            type: "respondCounter",
            sourceInstanceId: eligible.instanceId,
            effectKey: eligible.effectKey,
          });
    await settle(() => false, 60);

    expect(responded?.ok ?? false).toBe(false);
    expect(s.perm("impmon").topCard.cardId).toBe("EX2-039");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("EX10-074");
  });

  it("[When Attacking] mills 2 and holds the printed cost-6 boundary with an empty trash", async () => {
    // Trash starts empty; the two milled cards leave 2 in trash, so floor(2 / 10) * 3 = 0 is
    // added and the printed ceiling stays at exactly 6.
    // FAILS-WHEN-REVERTED: drop the WhenAttacking window => nothing is milled and the cost-6
    // survives; raise `playCostCeiling.base` or `raise` => the cost-7 is deleted too.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-074", as: "beelzemon" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "cost6" },
            { card: "BT1-024", as: "cost7" },
          ],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const cost6Id = s.perm("cost6").permanentId;
    const cost7Id = s.perm("cost7").permanentId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("beelzemon"));
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === cost6Id) === undefined, 200);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost6Id)).toBeUndefined();
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost7Id)).toBeDefined();
  });

  it("the scaled ceiling is a hard bound: 20 trash cards reach 12, never 13", async () => {
    // 18 in trash + the 2 milled = 20 => 6 + floor(20 / 10) * 3 = 12.
    // FAILS-WHEN-REVERTED: remove the `playCostLte` bound / widen `raise` => the cost-13 becomes
    // a legal candidate and can be deleted instead.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(18).fill("BT1-001"),
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "AD1-004", as: "cost12" },
            { card: "BT19-054", as: "cost13" },
          ],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const cost12Id = s.perm("cost12").permanentId;
    const cost13Id = s.perm("cost13").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === cost12Id) === undefined);

    const offered = s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).not.toContain(cost13Id);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost12Id)).toBeUndefined();
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost13Id)).toBeDefined();
  });

  it("CR 15-7-4: declining the 'by returning 2 cards' condition leaves the trash and stack alone", async () => {
    // 10 cards in trash (2 non-Digi-Egg) satisfies the `zoneCount >= 10` gate, so the only thing
    // stopping the De-Digivolve is the player's refusal.
    // FAILS-WHEN-REVERTED: drop `optional: true` / `abortOnDecline: true` => the return cost is
    // auto-paid and the opponent's stack is peeled anyway.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-074", as: "beelzemon" }],
          trash: ["BT1-009", "BT1-010", ...Array(8).fill("BT1-001")],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const stackBefore = s.perm("target").stack.map(({ instanceId }) => instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("beelzemon"));
    await settle(() => s.state.players[0]!.trash.length === 12, 200);

    // The two milled cards landed in trash; the two non-Digi-Egg cards were NOT returned to deck.
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual(stackBefore);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
    // Trash 12 => ceiling 9, so the cost-12 opponent is out of the Delete's reach and survives.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
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
