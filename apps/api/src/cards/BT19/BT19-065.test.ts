import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-065 Machinedramon — Black/Purple Lv.6 Mega, 11000 DP, play cost 11,
 * evo cost 3 from a Black or Purple Lv.5.
 *
 * Printed clauses:
 *   1. [On Play] [When Digivolving] Delete 1 level 5 or lower Digimon.        (main)
 *   2. [On Deletion] You may play 1 level 5 or lower Digimon card with the [Cyborg]/
 *      [Composite] trait from your trash without paying the cost.             (main)
 *   3. [Rule] Trait: Has the [Composite] type.                                (main)
 *   4. [DigiXros -1] 5 Lv.5 or lower [Cyborg]/[Composite] trait Digimon cards
 *      w/different card numbers                                               (header)
 *   5. [Opponent's Turn] [Once Per Turn] When any of your opponent's Digimon attack, you
 *      may change the attack target to 1 of your Digimon with the [Composite]/
 *      [Wicked God] trait.                                                    (inherited)
 *
 * KB (`node tools/kb/query.mjs card BT19-065`):
 *   Q3128 — clause 1 may delete YOUR OWN Digimon (the filter carries no controller gate).
 *   Q3129 — clause 5 may redirect onto a Digimon that is unaffected by effects.
 *
 * Comprehensive rules for clause 4: §7-2-2-1 reduces the play cost by the printed amount
 * for EACH card placed (so `count: 1` is the per-material discount, not a material count),
 * and §7-2-2-4 lets the player place ANY number of the specified cards — there is no
 * minimum beyond one, which is why the IR caps with `maxMaterials: 5` and sets no floor.
 */

const LV5_CYBORG = "ST5-10"; // MetalTyrannomon: Black Lv.5 9000 DP [Cyborg], no effects
const LV5_CYBORG_B = "BT2-060"; // Megadramon: Black Lv.5 9000 DP [Cyborg], no effects
const LV5_PURPLE = "BT5-077"; // Vajramon: Purple Lv.5 8000 DP, no effects
const LV5_GREEN = "ST4-09"; // Okuwamon: Green Lv.5 7000 DP, no effects — illegal source
const LV5_PLAIN = "BT10-064"; // Gogmamon: Black Lv.5 8000 DP [Rock] — near-miss, wrong trait
const LV6_CYBORG = "BT2-064"; // HiAndromon: Black Lv.6 12000 DP [Cyborg] — near-miss, wrong level
const LV6_WALL = "BT1-080"; // Titamon: Green Lv.6 12000 DP, no effects
const COMPOSITE_LV4 = "BT6-012"; // Deltamon: Red Lv.4 7000 DP [Composite]
const CYBORG_LV3 = "BT3-059"; // Commandramon: Black Lv.3 [Cyborg]
const CYBORG_LV3_B = "ST5-05"; // Commandramon: same NAME, different card number [Cyborg]
const CYBORG_LV4 = "BT3-067"; // Tankmon: Black Lv.4 [Cyborg]
const PLAIN_LV3 = "BT1-009"; // Monodramon: Red Lv.3 [Dragonkin], no effects
const PLAIN_LV4 = "BT1-014"; // Kokatorimon: Red Lv.4, no effects
const INERT_SECURITY = "BT1-010";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];

describe("BT19-065 Machinedramon", () => {
  it("matches the catalog printing and compiles every clause with no residual", () => {
    expect(getCardDefinition("BT19-065")).toMatchObject({
      cardId: "BT19-065",
      nameEn: "Machinedramon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "Composite"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Purple", level: 5, memoryCost: 3 },
      ],
    });
    // The catalog stores this line with a NON-BREAKING SPACE (U+00A0) before "you may change";
    // normalize before comparing (reported as a cosmetic catalog discrepancy, not edited here).
    expect(getCardDefinition("BT19-065")?.inheritedEffectText?.replace(/\u00A0/g, " ")).toBe(
      "[Opponent's Turn] [Once Per Turn] When any of your opponent's Digimon attack, you may change the attack target to 1 of your Digimon with the [Composite]/[Wicked God] trait.",
    );
    expect(getCardDefinition("BT19-065")?.effectText?.replace(/\u00A0/g, " ")).toContain(
      "[DigiXros -1] 5 Lv.5 or lower [Cyborg]/[Composite] trait Digimon cards w/different card numbers",
    );

    const card = runtimeCompiledCard("BT19-065");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      // Q3128: no `controller` predicate — either player's Digimon is a legal target.
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 },
          },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 5 },
                // "with the [X]/[Y] trait" is an EXACT trait match.
                nameOrTrait: [{ tokens: ["Cyborg", "Composite"], match: "trait" }],
              },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
        ],
      },
      // A printed "[Rule] Trait: ..." line needs a Rule/GrantStatic node, not a plain comment.
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            actions: [
              {
                kind: "RedirectAttack",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
                  },
                  count: 1,
                },
                optional: true,
              },
            ],
          },
        ],
      },
    ]);
    expect(card?.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            levelComparison: { op: "lte", value: 5 },
            nameOrTrait: [{ tokens: ["Cyborg", "Composite"], match: "trait" }],
            differentCardNumbers: true,
          },
        ],
        count: 1,
        maxMaterials: 5,
      },
    ]);
  });

  it("deletes an opponent's level 5 Digimon on play and leaves a level 6 peer alone", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-065", as: "machine" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: LV5_PLAIN, as: "lv5" },
            { card: LV6_CYBORG, as: "lv6" },
          ],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const lv6Id = s.perm("lv6").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([lv6Id]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV5_PLAIN]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-065"]);
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("Q3128: the same clause may delete YOUR OWN level 5 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_PLAIN, as: "own" }],
          hand: [
            { card: "BT19-065", as: "machine" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === LV5_PLAIN));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-065"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([LV5_PLAIN]);
    expect(s.state.memory).toBe(1);
  });

  it("deletes on the [When Digivolving] branch too, and digivolves for 3 from a black Lv.5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV5_CYBORG, as: "base" }],
          hand: [{ card: "BT19-065", as: "machine" }],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: LV5_PLAIN, as: "victim" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const baseId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("machine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe("BT19-065");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV5_PLAIN]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("digivolves from a purple Lv.5 too, but refuses a green Lv.5 source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: LV5_PURPLE, as: "purple" },
            { card: LV5_GREEN, as: "green" },
          ],
          hand: [{ card: "BT19-065", as: "machine" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const machineId = s.inst("machine").instanceId;
    const purpleBaseId = s.perm("purple").topCard!.instanceId;

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("green").permanentId,
          instanceId: machineId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([machineId]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purple").permanentId,
        instanceId: machineId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purple").topCard?.cardId === "BT19-065");

    expect(s.state.memory).toBe(5);
    expect(s.perm("purple").stack.map((card) => card.instanceId)).toEqual([purpleBaseId]);
  });

  it("carries the [Composite] trait itself, which its own inherited redirect filter accepts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-065", as: "machine" },
          { card: LV5_PLAIN, as: "plain" },
        ],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    await s.ready();

    // Cross-card consequence: the trait the [Rule] line grants is the one the
    // [Composite]/[Wicked God] redirect filter and the DigiXros recipe both read.
    expect(observe(s.engine).hasEffectiveTrait(s.perm("machine"), "Composite")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plain"), "Composite")).toBe(false);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("plain"), "Rock")).toBe(true);
  });

  it("plays a [Cyborg] Lv.5 free from trash on deletion, ignoring near-miss trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-065", as: "machine" }],
          trash: [
            { card: LV6_CYBORG, as: "wrongLevel" },
            { card: LV5_PLAIN, as: "wrongTrait" },
            { card: LV5_CYBORG_B, as: "target" },
          ],
          security: [{ card: INERT_SECURITY, as: "own" }],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: LV6_WALL, as: "wall", dp: 12000, suspended: true }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("target").instanceId;
    const wrongLevelId = s.inst("wrongLevel").instanceId;
    const wrongTraitId = s.inst("wrongTrait").instanceId;

    // 11000 DP into a 12000 DP wall: Machinedramon is deleted in battle.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === targetId));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === targetId);
    expect(played?.topCard?.cardId).toBe(LV5_CYBORG_B);
    expect(played?.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual([LV5_CYBORG_B]);
    // Both near-miss cards are still in the trash, alongside the deleted Machinedramon.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([wrongLevelId, wrongTraitId]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-065")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("is optional on deletion: declining leaves the trash [Cyborg] where it is", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-065", as: "machine" }],
          trash: [{ card: LV5_CYBORG_B, as: "target" }],
          security: [{ card: INERT_SECURITY, as: "own" }],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: LV6_WALL, as: "wall", dp: 12000, suspended: true }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("target").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(targetId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("DigiXros: 5 different-numbered Lv.5-or-lower [Cyborg]/[Composite] cards cut the cost to 6", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-065", as: "machine" },
            { card: CYBORG_LV3, as: "m1" },
            { card: CYBORG_LV3_B, as: "m2" },
            { card: CYBORG_LV4, as: "m3" },
            { card: COMPOSITE_LV4, as: "m4" },
            { card: LV5_CYBORG_B, as: "m5" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: LV5_PLAIN, as: "victim" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const machineId = s.inst("machine").instanceId;
    const materialIds = ["m1", "m2", "m3", "m4", "m5"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: machineId,
        digiXros: { materialInstanceIds: materialIds },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // 11 printed - 5 materials x 1 = 6.
    expect(s.state.memory).toBe(0);
    const machine = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === machineId);
    expect(machine?.topCard?.cardId).toBe("BT19-065");
    // All five materials landed under the played card (the engine stacks them top-down).
    expect(machine?.stack.map((card) => card.instanceId).sort()).toEqual([...materialIds].sort());
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([PLAIN_LV3]);
    // The DigiXros play is still a play: [On Play] fired and deleted the opposing Lv.5.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([LV5_PLAIN]);
  });

  it("DigiXros rejects a 6th material, a duplicate card number, a wrong trait and a Lv.6", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-065", as: "machine" },
            { card: CYBORG_LV3, as: "m1" },
            { card: CYBORG_LV3, as: "m1dup" },
            { card: CYBORG_LV3_B, as: "m2" },
            { card: CYBORG_LV4, as: "m3" },
            { card: COMPOSITE_LV4, as: "m4" },
            { card: LV5_CYBORG_B, as: "m5" },
            { card: LV5_CYBORG, as: "m6" },
            { card: PLAIN_LV4, as: "wrongTrait" },
            { card: LV6_CYBORG, as: "wrongLevel" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    await s.ready();
    const machineId = s.inst("machine").instanceId;
    const id = (alias: string): string => s.inst(alias).instanceId;
    const five = ["m1", "m2", "m3", "m4", "m5"].map(id);

    const rejected: [string, string[]][] = [
      // maxMaterials: 5 is the printed cap.
      ["six materials", [...five, id("m6")]],
      // "w/different card numbers": two prints of the same cardId are not allowed together.
      ["duplicate card number", [id("m1"), id("m1dup"), id("m2"), id("m3"), id("m4")]],
      // The single-slot recipe requires every material to carry [Cyborg] or [Composite].
      ["wrong trait", [id("m1"), id("m2"), id("m3"), id("m4"), id("wrongTrait")]],
      // Lv.5 or lower.
      ["wrong level", [id("m1"), id("m2"), id("m3"), id("m4"), id("wrongLevel")]],
    ];
    for (const [, materialInstanceIds] of rejected) {
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: machineId, digiXros: { materialInstanceIds } }),
      ).not.toEqual({ ok: true });
    }

    expect(s.state.memory).toBe(12);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(machineId);
  });

  it("inherited: redirects one opponent-turn attack onto a [Composite] Digimon, once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PLAIN_LV4, as: "carrier", dp: 4000, under: ["BT19-065"] },
            { card: COMPOSITE_LV4, as: "composite", dp: 7000 },
            // Deliberately WEAKER than the attacker: if the filter wrongly accepted a
            // non-[Composite] Digimon, this one would be deleted instead of winning.
            { card: PLAIN_LV4, as: "nearMiss", dp: 2000 },
          ],
          security: [
            { card: INERT_SECURITY, as: "own1" },
            { card: INERT_SECURITY, as: "own2" },
            { card: INERT_SECURITY, as: "own3" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [
            { card: PLAIN_LV3, as: "attackerOne", dp: 3000 },
            { card: PLAIN_LV3, as: "attackerTwo", dp: 3000 },
          ],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);

    const compositeId = s.perm("composite").permanentId;
    const nearMissId = s.perm("nearMiss").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The attack was moved off the player onto the 7000-DP [Composite] Digimon, which won:
    // no security card was checked, and the near-miss peer was never a candidate.
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual(
      expect.arrayContaining([compositeId, nearMissId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    // [Once Per Turn]: the second attack this turn is not redirected and reaches security.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3129: the redirect still lands on a Digimon that cannot be affected by effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PLAIN_LV4, as: "carrier", dp: 4000, under: ["BT19-065"] },
            { card: COMPOSITE_LV4, as: "composite", dp: 7000 },
          ],
          security: [
            { card: INERT_SECURITY, as: "own1" },
            { card: INERT_SECURITY, as: "own2" },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: PLAIN_LV3, as: "attacker", dp: 3000 }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Arm the "unaffected by effects" state the ruling is about through the production
    // restriction primitive, then check the redirect is unaffected by it.
    await advance(s.engine).verb.restrict(
      s.perm("composite").permanentId,
      "beAffected",
      EffectDuration.UntilEachTurnEnd,
    );
    expect(observe(s.engine).hasRestriction(s.perm("composite"), "beAffected")).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
