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
    expect(enough.state.memory).toBe(6);
  });

  it("the alternate route reads [Impmon] as a name SUBSTRING, and refuses a non-Impmon Lv.3", async () => {
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
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5191: ＜Blast Digivolve＞ from hand at counter timing over the 20-trash Impmon path", async () => {
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
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        declinePrompts: ["returning 2 non-Digi-Egg cards"],
      },
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
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toContain("BT1-013");
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT1-014", "BT1-019"]);
  });

  it("Q5191 negative: 19 cards in trash leaves the Impmon base illegal even for the blast", async () => {
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
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ACE ＜Overflow -4＞ charges its owner when this Digimon leaves the battle area", async () => {
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
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });

  it("the scaled ceiling is a hard bound: 20 trash cards reach 12, never 13", async () => {
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

    expect(s.state.players[0]!.trash).toHaveLength(12);
    expect(s.perm("target").topCard.cardId).toBe("AD1-004");
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toEqual(stackBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore.slice(0, -2));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5190: pays by returning exactly 2 non-Digi-Egg cards to the DECK TOP and De-Digivolves 2", async () => {
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

    expect(s.perm("target").topCard.instanceId).toBe(s.inst("lv5").instanceId);
    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["AD1-004", "BT1-014"]);
    expect(
      s.state.players[0]!.deck.slice(-2)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("payA").instanceId, s.inst("payB").instanceId].sort());
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT1-001")).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5190: one non-Digi-Egg card among Digi-Eggs cannot partially pay the return cost", async () => {
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
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("onlyPayable").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("Q5189: the two [On Play] clauses are simultaneous and the player picks the order", async () => {
    const run = async (orderIndex: number) => {
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
        opponentTrash: s.state.players[1]!.trash.map(({ cardId }) => cardId),
      };
    };

    const first = await run(0);
    const second = await run(1);
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
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-050", as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "EX10-074", as: "beelzemon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: ["BT1-019", "BT1-024"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        declinePrompts: ["returning 2 non-Digi-Egg cards"],
      },
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

    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("beelzemon").instanceId]);
    expect(p0.battleArea[0]!.stack).toHaveLength(0);
    expect(p0.deck).toHaveLength(0);
    expect(p0.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-019", "BT1-024"]));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
