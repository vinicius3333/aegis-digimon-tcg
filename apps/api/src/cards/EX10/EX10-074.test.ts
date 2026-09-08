import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
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
    // "Lv.3 w/[Impmon] in name" is a SUBSTRING gate, so it must compile to `names`
    // (`digivolutionRequirementsFor`'s substring field), never to an exact-name field.
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
    // The second [On Play]/[When Digivolving] clause: an optional "by" cost that returns
    // exactly 2 NON-Digi-Egg trash cards to the TOP of the deck (Q5190).
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(
        compiled.effects.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "DeDigivolve"),
      ).toMatchObject({
        actions: [
          {
            kind: "DeDigivolve",
            amount: 2,
            optional: true,
            abortOnDecline: true,
            condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 },
            cost: {
              kind: "return",
              to: "deckTop",
              target: { count: 2, filter: { zone: "trash", controller: "mine", excludeKind: ["DigiEgg"] } },
            },
          },
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
    expect(enough.perm("impmon").topCard.cardId).toBe("EX10-074");
    expect(enough.perm("impmon").stack.map(({ cardId }) => cardId)).toContain("EX2-039");
    // Cost 4 off a memory of 10.
    expect(enough.state.memory).toBe(6);
  });

  it("the alternate route reads [Impmon] as a name SUBSTRING, and refuses a non-Impmon Lv.3", async () => {
    // "w/[Impmon] in name" is a substring gate: BT12-073 "Impmon (X Antibody)" is a legal base
    // even though its name is not exactly [Impmon].
    // FAILS-WHEN-REVERTED: compile the requirement as an exact-name gate and this base is refused.
    const substring = setupEngine({
      0: {
        battleArea: [{ card: "BT12-073", as: "impmonX" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(20).fill("BT1-001"),
        deck: ["BT1-009"],
      },
    });
    substring.state.memory = 10;
    expect(
      substring.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: substring.perm("impmonX").permanentId,
        instanceId: substring.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => substring.perm("impmonX").topCard.cardId === "EX10-074");
    expect(substring.perm("impmonX").topCard.cardId).toBe("EX10-074");

    // A Lv.3 with no [Impmon] in its name is refused even with 20 cards in the trash, so the
    // gate is a name filter and not merely a level check.
    const wrongName = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "EX10-074", as: "beelzemon" }],
        trash: Array(20).fill("BT1-001"),
        deck: ["BT1-009"],
      },
    });
    wrongName.state.memory = 10;
    expect(
      wrongName.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongName.perm("monodramon").permanentId,
        instanceId: wrongName.inst("beelzemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("counts the two newly milled cards before scaling the deletion ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: Array(18).fill("BT1-001"),
          deck: ["BT1-009", "BT1-013"],
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
    expect(s.state.players[0]!.trash.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // Play cost 7 off a memory of 10.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
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
          deck: ["BT1-013", "BT1-014", "BT1-019"],
          security: ["BT1-013"],
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
    // The digivolution bonus draw took the deck's top card, then [When Digivolving] rode the
    // blast and milled the next 2.
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT1-013");
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT1-014", "BT1-019"]);
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
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-013"],
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

  it("[When Attacking] fires on a real attack, mills 2, and holds the printed cost-6 boundary", async () => {
    // Trash starts empty; the two milled cards leave 2 in trash, so floor(2 / 10) * 3 = 0 is
    // added and the printed ceiling stays at exactly 6. Driven by the public `attack` intent —
    // no injected timing.
    // FAILS-WHEN-REVERTED: drop the WhenAttacking window => nothing is milled and the cost-6
    // survives; raise `playCostCeiling.base` or `raise` => the cost-7 is deleted too.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-074", as: "beelzemon" }], deck: ["BT1-013", "BT1-014"] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "cost6" },
            { card: "BT1-024", as: "cost7" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    const cost6Id = s.perm("cost6").permanentId;
    const cost7Id = s.perm("cost7").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === cost6Id) === undefined);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost6Id)).toBeUndefined();
    expect(s.state.players[1]!.battleArea.find((p) => p.permanentId === cost7Id)).toBeDefined();
    // The attack itself went through: the single security card was checked and lost.
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ACE ＜Overflow -4＞ charges its owner when this Digimon leaves the battle area", async () => {
    // The catalog marks EX10-074 `isAce` with `overflowMemory: 4`; the rule is engine-side
    // (`applyOverflow`, CR §4-18) and only observable when the card actually leaves the field.
    // Beelzemon (12000 DP) attacks a 15000 DP wall and dies in the battle.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-074", as: "beelzemon" }], deck: ["BT1-013", "BT1-014"] },
        1: { battleArea: [{ card: "BT1-024", as: "wall", dp: 15_000, suspended: true }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX10-074");
    // The cost-7 wall is above the ceiling (trash 2 => 6), so it survived the [When Attacking]
    // delete and won the battle. Overflow then took 4 from seat 0's own memory.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(1);
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
          deck: ["BT1-009", "BT1-013"],
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
    // stopping the De-Digivolve is the player's refusal. Driven by the public `playCard` intent.
    // FAILS-WHEN-REVERTED: drop `optional: true` / `abortOnDecline: true` => the return cost is
    // auto-paid and the opponent's stack is peeled anyway.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: ["BT1-013", "BT1-014", ...Array(8).fill("BT1-001")],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-024", "BT1-014"] }] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const stackBefore = s.perm("target").stack.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 12);

    // The two milled cards landed in trash; nothing was returned to the deck and the opponent's
    // stack was never peeled.
    expect(s.state.players[0]!.trash).toHaveLength(12);
    expect(s.perm("target").topCard.cardId).toBe("AD1-004");
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual(stackBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore.slice(0, -2));
    // Trash 12 => ceiling 9, so the cost-12 opponent is out of the Delete's reach and survives.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5190: pays by returning exactly 2 non-Digi-Egg cards to the DECK TOP and De-Digivolves 2", async () => {
    // The target is a Lv.6 over a Lv.4 and a Lv.5 source, so both peels are legal
    // (`deDigivolve`'s levelFloor = 3 would stop the second peel over Lv.3 sources).
    // FAILS-WHEN-REVERTED: `amount: 1` leaves the Lv.4 on top; `to: "trash"` leaves the deck
    // untouched; dropping `excludeKind: ["DigiEgg"]` lets the 8 Digi-Eggs pay the cost.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: [{ card: "BT1-013", as: "payA" }, { card: "BT1-014", as: "payB" }, ...Array(8).fill("BT1-001")],
          deck: ["BT1-009", "BT1-019"],
        },
        1: {
          battleArea: [
            { card: "AD1-004", as: "target", under: ["BT1-009", { card: "BT1-024", as: "lv5" }, "BT1-014"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT1-024");

    // Two peels: AD1-004 (Lv.6) and BT1-014 (Lv.4) went to the opponent's trash, exposing the Lv.5.
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("lv5").instanceId);
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["AD1-004", "BT1-014"]);
    // The 2 non-Digi-Egg trash cards went to the TOP of the deck, above what was left there.
    expect(
      s.state.players[0]!.deck.slice(-2)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("payA").instanceId, s.inst("payB").instanceId].sort());
    // 8 Digi-Eggs stayed in the trash, joined by the 2 cards the other clause milled.
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT1-001")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5190: one non-Digi-Egg card among Digi-Eggs cannot partially pay the return cost", async () => {
    // Trash is 10 cards (the `zoneCount >= 10` gate passes) but only ONE is a non-Digi-Egg, so
    // the "by returning 2" condition can never be met and the De-Digivolve does not happen.
    // The deck is deliberately empty: the sibling clause's mill would otherwise drop two more
    // non-Digi-Egg cards into the trash and make the cost payable after all.
    // FAILS-WHEN-REVERTED: drop `count: 2` (or `excludeKind`) and the single card, or a
    // Digi-Egg, pays the cost and the opponent's stack is peeled.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-074", as: "beelzemon" }],
          trash: [{ card: "BT1-013", as: "onlyPayable" }, ...Array(9).fill("BT1-001")],
        },
        1: {
          battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-024", "BT1-014"] }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const before = s.perm("target").stack.map(({ instanceId }) => instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 200);

    expect(s.state.players[0]!.trash).toHaveLength(10);

    expect(s.perm("target").topCard.cardId).toBe("AD1-004");
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual(before);
    // The one non-Digi-Egg card never left the trash.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("onlyPayable").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("Q5189: the two [On Play] clauses are simultaneous and the player picks the order", async () => {
    // Both [On Play] clauses are activatable (trash 10 clears the De-Digivolve gate), so the
    // engine must ask which resolves next instead of running them in IR order. The order is
    // observable in the deck, because the two clauses touch the same two cards:
    //   mill first  => the deck's own top 2 go to the trash, then payA/payB are returned ON TOP
    //                  of the emptied deck, so the deck ends as [payA, payB];
    //   return first => payA/payB go on top of the deck, and the mill then takes exactly those
    //                  two straight back to the trash, so the deck ends as [BT1-009, BT1-019].
    // FAILS-WHEN-REVERTED: fold the two clauses into one effect and no `orderTriggers` decision
    // is raised; make the return cost land anywhere but the deck top and both orders agree.
    const run = async (orderIndex: number) => {
      // The mill puts two more non-Digi-Egg cards in the trash, so the return cost has 4
      // candidates in the mill-first order. Bias the pick to payA/payB in BOTH orders so the
      // only difference between the two runs is the order itself.
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "EX10-074", as: "beelzemon" }],
            trash: [{ card: "BT1-013", as: "payA" }, { card: "BT1-014", as: "payB" }, ...Array(8).fill("BT1-001")],
            deck: ["BT1-009", "BT1-019"],
          },
          1: {
            battleArea: [{ card: "AD1-004", as: "target", under: ["BT1-009", "BT1-024", "BT1-014"] }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false, preferInstanceIds },
      );
      preferInstanceIds.push(s.inst("payA").instanceId, s.inst("payB").instanceId);
      s.state.memory = 10;
      expect(s.state.players[0]!.trash).toHaveLength(10);

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("beelzemon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision;
      expect(decision?.kind).toBe("orderTriggers");
      const request = s.decisions.find(({ req }) => req.decisionId === decision!.decisionId)!.req;
      const keys = request.options?.triggerKeys;
      expect(keys).toHaveLength(2);
      // Both entries name the same source card: they are two clauses of one printed card.
      expect(request.options?.triggerCardIds).toEqual(["EX10-074", "EX10-074"]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision!.decisionId,
          response: { kind: "orderTriggers", order: [keys![orderIndex]!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);

      return {
        deck: s.state.players[0]!.deck.map(({ cardId }) => cardId),
        // The two peeled cards land in the opponent's trash whichever order ran; in the
        // return-first order the exposed Lv.5 (cost 7) is then within the Delete's reach and the
        // whole permanent follows, so the trash is read instead of the permanent.
        opponentTrash: s.state.players[1]!.trash.map(({ cardId }) => cardId),
      };
    };

    const first = await run(0);
    const second = await run(1);
    // Both orders reach both clauses; the player's choice decides which two cards end up in the
    // deck, which is what "the player can choose the activation order" means in play (Q5189).
    for (const result of [first, second])
      expect(result.opponentTrash).toEqual(expect.arrayContaining(["AD1-004", "BT1-014"]));
    expect(first.deck).not.toEqual(second.deck);
    expect([first.deck, second.deck].map((deck) => [...deck].sort())).toEqual(
      expect.arrayContaining([
        ["BT1-013", "BT1-014"],
        ["BT1-009", "BT1-019"],
      ]),
    );
  });

  it("peer route: EX10-050 Baalmon free-plays this exact-name [Beelzemon] and its [On Play] resolves", async () => {
    // EX10-050's [On Deletion] plays 1 [Beelzemon] (exact name) from the trash without paying
    // the cost. EX10-074 is named exactly "Beelzemon", so it is a legal choice — and the play is
    // a real play, so this card's [On Play] fires off a cross-card route with no injected timing.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-050", as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "EX10-074", as: "beelzemon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: ["BT1-019", "BT1-024"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    const p0 = s.state.players[0]!;
    expect(p0.trash).toHaveLength(6);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("baalmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("beelzemon").instanceId));

    // Beelzemon arrived from the trash for free, alone on its own permanent.
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(p0.battleArea[0]!.stack).toHaveLength(0);
    // Its [On Play] milled the deck's top 2 …
    expect(p0.deck).toHaveLength(0);
    expect(p0.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-019", "BT1-024"]));
    // … and deleted the cost-3 wall that had just won the battle (trash 11 => ceiling 9).
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
