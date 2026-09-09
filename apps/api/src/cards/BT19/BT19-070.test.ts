import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./BT19-070.js";

// BT19-070 Kimeramon (Red/Purple, Lv.5 Ultimate/Data/[Composite], DP 8000, play 8,
// EvoCost Purple Lv.4 / Red Lv.4 for 4).
//   [Digivolve]Lv.4 w/[Composite] trait: Cost 3
//   [On Play] [When Digivolving] By deleting 1 of your Digimon, delete 1 of your opponent's
//     level 3 Digimon, 1 of their level 4 Digimon, and 1 of their level 5 Digimon.
//   [On Deletion] By deleting 1 of your level 4 or lower purple or red Digimon, you may play
//     1 [Machinedramon] from your trash without paying the cost.
//   [DigiXros -1] 3 Lv.4 [Composite] trait Digimon cards w/different card numbers
//   Inherited: ＜Security Attack +1＞.
//
// KB Q3131 (2024-09-20): the [On Play] [When Digivolving] cost may delete this Digimon itself.
// KB Q3132 (2024-09-20): the [On Deletion] condition is "1 of your level 4 or lower PURPLE
//   Digimon or 1 of your level 4 or lower RED Digimon" — colour and level both gate it.
// Comprehensive 15-7-4: a "by …," processing condition is the controller's choice.
//
// Fixtures — inert main-deck Digimon so nothing but the card under test speaks:
//   BT1-009 Monodramon (Red Lv.3), BT1-014 Kokatorimon (Red Lv.4), BT1-020 Groundramon
//   (Red Lv.5), BT3-089 Boltmon (Purple Lv.6, the "level 5 or lower" near miss),
//   BT3-083 Meramon (Purple Lv.4), BT1-071 Vegiemon (GREEN Lv.4 — the Q3132 colour near miss).
//   DigiXros materials: BT6-012 Deltamon, BT19-068 Shademon, BT19-069 Deltamon, BT25-068
//   Deltamon — four Lv.4 [Composite] Digimon with different card numbers.
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];

describe("BT19-070 Kimeramon", () => {
  it("matches the catalog printing, evolution costs and inherited text", () => {
    expect(getCardDefinition("BT19-070")).toMatchObject({
      cardId: "BT19-070",
      nameEn: "Kimeramon",
      colors: ["Red", "Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Composite"],
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      inheritedEffectText: "＜Security Attack +1＞.",
    });
    const printed = getCardDefinition("BT19-070")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.4 w/[Composite] trait: Cost 3");
    expect(printed).toContain(
      "[On Play] [When Digivolving] By deleting 1 of your Digimon, delete 1 of your opponent's level 3 Digimon, 1 of their level 4 Digimon, and 1 of their level 5 Digimon.",
    );
    expect(printed).toContain(
      "[On Deletion] By deleting 1 of your level 4 or lower purple or red Digimon, you may play 1 [Machinedramon] from your trash without paying the cost.",
    );
    expect(printed).toContain("[DigiXros -1] 3 Lv.4 [Composite] trait Digimon cards w/different card numbers");
  });

  it("compiles the three ordered deletions, the exact-name revival and the inherited keyword", () => {
    const card = runtimeCompiledCard("BT19-070");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], levels: [3] } },
            cost: { kind: "deleteOwn", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } } },
            // Comprehensive 15-7-4: the "by deleting" condition is declinable.
            optional: true,
            abortOnDecline: true,
          },
          { kind: "Delete", target: { count: 1, filter: { controller: "opponent", levels: [4] } } },
          { kind: "Delete", target: { count: 1, filter: { controller: "opponent", levels: [5] } } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            // Printed `[Machinedramon]` is exact, not a substring gate.
            target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Machinedramon"], match: "nameExact" }] } },
            cost: {
              kind: "deleteOwn",
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple", "Red"],
                  levelComparison: { op: "lte", value: 4 },
                },
              },
            },
          },
        ],
      },
      { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "SecurityAttack", amount: 1 }] },
    ]);
    expect(card?.digivolutionRequirement).toEqual([{ level: 4, traits: ["Composite"], cost: 3, isAlternate: true }]);
    // The DigiXros recipe the SERVER reads comes from the shared override table
    // (`DIGIXROS_REQUIREMENT_OVERRIDES`), which shadows this module's own field.
    expect(digiXrosRequirementFor("BT19-070")).toEqual([
      {
        materials: [
          {
            levelComparison: { op: "eq", value: 4 },
            nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
            differentCardNumbers: true,
          },
        ],
        count: 1,
        maxMaterials: 3,
      },
    ]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] — one deletion per printed level
  // ---------------------------------------------------------------------------

  it("[On Play] pays with one of your Digimon and deletes exactly one Lv.3, Lv.4 and Lv.5", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "sacrifice" }],
          hand: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
            { card: "BT3-089", as: "level6" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("sacrifice").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kimeramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.memory).toBe(1);
    // The cost took the seeded Digimon, not the freshly played Kimeramon.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-070"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    // One per printed level; the Lv.6 is not named by the clause and survives.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("level6").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-014", "BT1-020"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3131: the cost may delete this Digimon itself, and the deletions still resolve", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    const kimeramonId = s.inst("kimeramon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kimeramonId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // Kimeramon was the only Digimon its controller had, so the cost took itself.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([kimeramonId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-014", "BT1-020"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the 'by deleting' condition skips the whole clause (15-7-4)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "sacrifice" }],
          hand: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kimeramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Evolution routes
  // ---------------------------------------------------------------------------

  it("[Digivolve] Lv.4 w/[Composite] costs 3 and fires [When Digivolving]", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-069", as: "composite" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          hand: [{ card: "BT19-070", as: "kimeramon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("sacrifice").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    const baseId = s.inst("composite").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("composite").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // Cost 3 through the [Composite] route, not the 4 of the printed Purple Lv.4 EvoCost.
    expect(s.state.memory).toBe(7);
    expect(s.perm("composite").topCard?.cardId).toBe("BT19-070");
    expect(s.perm("composite").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-014", "BT1-020"]);
  });

  it("falls back to the normal Lv.4 EvoCost of 4 for a Lv.4 peer without the [Composite] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "plainLv4" }],
          hand: [{ card: "BT19-070", as: "kimeramon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plainLv4").permanentId,
        instanceId: s.inst("kimeramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("plainLv4").topCard?.cardId === "BT19-070");
    await settle();

    expect(s.state.memory).toBe(6);
  });

  it("refuses an illegal source: a Lv.3 that matches neither the EvoCost nor the [Composite] route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "monodramon" }],
          hand: [{ card: "BT19-070", as: "kimeramon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("monodramon").permanentId,
          instanceId: s.inst("kimeramon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("monodramon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kimeramon").instanceId]);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] — Q3132
  // ---------------------------------------------------------------------------

  it("[On Deletion] deletes a red Lv.4 to revive [Machinedramon] from the trash", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT1-014", as: "redLv4" },
          ],
          trash: [
            { card: "BT1-020", as: "control" },
            { card: "BT19-065", as: "machinedramon" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("redLv4").topCard!.instanceId, s.inst("machinedramon").instanceId);
    s.state.memory = 3;
    await s.ready();

    const kimeramonId = s.inst("kimeramon").instanceId;
    const machinedramonId = s.inst("machinedramon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kimeramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-065"));
    await settle();

    // 8000 DP into a 20 000 DP wall: Kimeramon dies, pays with the red Lv.4, revives free.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([machinedramonId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [kimeramonId, s.inst("redLv4").instanceId, s.inst("control").instanceId].sort(),
    );
    // Play cost 11 was never charged.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q3132: a green Lv.4 and a purple Lv.5 cannot pay the [On Deletion] condition", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT1-071", as: "greenLv4" },
            { card: "BT3-089", as: "purpleLv6" },
          ],
          trash: [{ card: "BT19-065", as: "machinedramon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const kimeramonId = s.inst("kimeramon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kimeramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === kimeramonId));
    await settle();

    // Neither the wrong-colour Lv.4 nor the too-high-level Purple can be the cost, so nothing
    // is deleted and Machinedramon stays in the trash.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-071",
      "BT3-089",
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [kimeramonId, s.inst("machinedramon").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] accepts a purple Lv.4 as the cost (the other half of Q3132)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT3-083", as: "purpleLv4" },
          ],
          trash: [{ card: "BT19-065", as: "machinedramon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("purpleLv4").topCard!.instanceId, s.inst("machinedramon").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kimeramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-065"));
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("machinedramon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT19-070", "BT3-083"]);
  });

  // ---------------------------------------------------------------------------
  // [DigiXros -1] 3 Lv.4 [Composite] with different card numbers
  // ---------------------------------------------------------------------------

  it("DigiXroses for 5 with three different Lv.4 [Composite] cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT6-012", as: "matA" },
            { card: "BT19-068", as: "matB" },
            { card: "BT19-069", as: "matC" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const materialIds = [s.inst("matA").instanceId, s.inst("matB").instanceId, s.inst("matC").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kimeramon").instanceId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    // Printed cost 8 minus 3 materials at -1 each, paid from 8.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("BT19-070");
    // Each material is placed at the bottom in turn, so `stack` (bottom-first) reads reversed.
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual([...materialIds].reverse());
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses duplicate card numbers, a non-[Composite] material and a fourth material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-070", as: "kimeramon" },
            { card: "BT6-012", as: "matA" },
            { card: "BT19-068", as: "matB" },
            { card: "BT19-069", as: "matC" },
            { card: "BT19-069", as: "matCduplicate" },
            { card: "BT25-068", as: "matD" },
            { card: "BT1-014", as: "plainLv4" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const kimeramonId = s.inst("kimeramon").instanceId;

    // "with different card numbers".
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: kimeramonId,
        digiXros: {
          materialInstanceIds: [
            s.inst("matA").instanceId,
            s.inst("matC").instanceId,
            s.inst("matCduplicate").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    // A Lv.4 Digimon without the [Composite] trait is not a material.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: kimeramonId,
        digiXros: {
          materialInstanceIds: [s.inst("matA").instanceId, s.inst("matB").instanceId, s.inst("plainLv4").instanceId],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    // "3 cards" is a cap, so a fourth qualifying material cannot buy an extra -1.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: kimeramonId,
        digiXros: {
          materialInstanceIds: [
            s.inst("matA").instanceId,
            s.inst("matB").instanceId,
            s.inst("matC").instanceId,
            s.inst("matD").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(7);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Inherited ＜Security Attack +1＞ under a real host
  // ---------------------------------------------------------------------------

  it("gives the host it sits under a second security check, while a bare peer checks one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-013", as: "host", dp: 20_000, under: ["BT19-070"] },
            { card: "BT1-013", as: "plainHost", dp: 20_000 },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: ["BT1-009", "BT1-013", "BT1-012", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("plainHost"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle();

    // Two security cards checked instead of one; both lost to the 20 000 DP attacker.
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
