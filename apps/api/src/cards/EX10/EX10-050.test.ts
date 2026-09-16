import { EffectTiming, getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-050.js";
import "../index.js";

const CARD_ID = "EX10-050";

describe("EX10-050 Baalmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Baalmon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Free"],
      types: ["Wizard", "Bagra Army"],
      inheritedEffectText: "[All Turns] For every 10 cards in your trash, this Digimon gets +1000 DP.",
    });
  });

  it("compiles every printed clause into IR", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Wizard"], cost: 3, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashTopDeck", controller: "mine", amount: 3 },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Reboot" },
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 },
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 5 },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "zoneCount", seat: "mine", zone: "trash", op: "gte", value: 10 },
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Beelzemon"], match: "nameExact" }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          scaling: { per: 10, unit: "trash", filter: { zone: "trash", controller: "mine" } },
        },
      ],
    });
  });

  it("[On Play] played from hand: mills 3, crosses 5 trash, gains Reboot and Blocker", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "baalmon" }, "BT1-013"],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
        trash: ["BT1-009", "BT1-013"],
      },
    });
    s.state.memory = 8;
    await s.ready();
    const p0 = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("baalmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.length === 5);

    const baalmon = p0.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    expect(baalmon.topCard!.instanceId).toBe(s.inst("baalmon").instanceId);
    expect(baalmon.currentDP).toBe(7000);
    expect(p0.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-014"]);
    expect(p0.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(1);
    expect(p0.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(observe(s.engine).hasKeyword(baalmon, "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(baalmon, "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] boundary: 4 cards in the trash after the mill grants neither keyword", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "baalmon" }, "BT1-013"],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
        trash: ["BT1-009"],
      },
    });
    s.state.memory = 8;
    await s.ready();
    const p0 = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("baalmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.length === 4);
    await settle(() => false, 30);

    const baalmon = p0.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    expect(p0.trash).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(baalmon, "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(baalmon, "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Digivolve] Lv.4 w/[Wizard]: Cost 3 beats the printed Cost 4, and a non-Wizard Lv.4 is refused", async () => {
    for (const [useAlternateCost, startingMemory] of [
      [true, 3],
      [false, 4],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "ST10-10", as: "base" }],
          hand: [{ card: CARD_ID, as: "baalmon" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: ["BT1-009", "BT1-013"],
        },
      });
      s.state.memory = startingMemory;
      await s.ready();
      const p0 = s.state.players[0]!;
      const wizardInstanceId = s.inst("base").instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("baalmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => p0.trash.length === 5);

      expect(s.state.memory).toBe(0);
      expect(p0.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
      expect(s.perm("base").topCard!.cardId).toBe(CARD_ID);
      expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([wizardInstanceId]);
      expect(p0.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-013", "BT1-014", "BT1-009"]);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: CARD_ID, as: "baalmon" }], deck: ["BT1-009"] },
    });
    invalid.state.memory = 8;
    await invalid.ready();
    for (const useAlternateCost of [true, false]) {
      expect(
        invalid.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: invalid.perm("base").permanentId,
          instanceId: invalid.inst("baalmon").instanceId,
          useAlternateCost,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
    expect(invalid.perm("base").topCard!.cardId).toBe("BT1-014");
  });

  it("the granted keywords survive the opponent's turn and expire when it ends", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "baalmon" }, "BT1-013"],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
        trash: ["BT1-009", "BT1-013"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        hand: ["BT1-013"],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const p0 = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("baalmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.length === 5);
    const baalmon = p0.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
    expect(observe(s.engine).hasKeyword(baalmon, "Blocker")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Blocker")).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5133: the deleted stack itself carries the trash to 10 and Beelzemon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "BT2-111", as: "beelzemon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
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
    expect(p0.trash.map((card) => card.cardId).sort()).toEqual(
      ["BT1-009", "BT1-009", "BT1-009", "BT1-013", "BT1-013", "BT1-013", "BT1-014", "BT1-014", "EX10-050"].sort(),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] boundary: 9 cards in the trash leaves Beelzemon where it is", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "BT2-111", as: "beelzemon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    expect(p0.trash).toHaveLength(5);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("baalmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 9);
    await settle(() => false, 40);

    expect(p0.battleArea).toHaveLength(0);
    expect(p0.trash.map((card) => card.instanceId)).toContain(s.inst("beelzemon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] is a 'may': declining leaves Beelzemon in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "BT2-111", as: "beelzemon" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("baalmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 10);
    await settle(() => false, 40);

    expect(p0.battleArea).toHaveLength(0);
    expect(p0.trash.map((card) => card.instanceId)).toContain(s.inst("beelzemon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Beelzemon] is an exact name: 'Beelzemon: Blast Mode' is not a legal choice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "baalmon", under: ["BT1-009", "BT1-013", "BT1-014"] }],
          trash: [{ card: "BT19-074", as: "blastMode" }, "BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 12_000, suspended: true }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("baalmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 10);
    await settle(() => false, 40);

    expect(p0.battleArea).toHaveLength(0);
    expect(p0.trash.map((card) => card.instanceId)).toContain(s.inst("blastMode").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: built through a real stack, the host gains +1000 DP per complete 10 trash cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST10-10", as: "base" }],
        hand: [
          { card: CARD_ID, as: "baalmon" },
          { card: "BT2-111", as: "beelzemon" },
        ],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    s.state.memory = 7;
    await s.ready();
    const p0 = s.state.players[0]!;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("baalmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length === 23);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT2-111");
    await settle(() => false, 30);

    const host = s.perm("base");
    expect(host.stack.map((card) => card.cardId)).toEqual(["ST10-10", CARD_ID]);
    expect(host.currentDP).toBe(getCardDefinition("BT2-111")!.dp! + 2000);

    for (let n = 0; n < 7; n += 1) s.give(0, Zone.Trash, "BT1-009");
    await s.ready();
    await settle(() => s.perm("base").currentDP === getCardDefinition("BT2-111")!.dp! + 3000, 200);
    expect(s.perm("base").currentDP).toBe(getCardDefinition("BT2-111")!.dp! + 3000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("structural: the OnPlay and WhenDigivolving branches are the same printed clause", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "baalmon" }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        trash: ["BT1-009", "BT1-013"],
      },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("baalmon"));
    await settle(() => s.state.players[0]!.trash.length === 5);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("baalmon"), "Blocker")).toBe(true);
  });
});
