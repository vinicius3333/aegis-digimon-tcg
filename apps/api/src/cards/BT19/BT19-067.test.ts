import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-067 Impmon — Purple Lv.3 Rookie, 2000 DP, play cost 4, evo cost 0 from a Purple Lv.2.
 *
 * Printed clauses:
 *   1. [On Play] If you have 1 or fewer Tamers, you may play 1 purple Tamer with a play
 *      cost of 4 or less from your trash without paying the cost.            (main)
 *   2. ＜Retaliation＞                                                        (inherited)
 *
 * KB: `node tools/kb/query.mjs card BT19-067` reports no knowledge-base entries — no Q&A,
 * errata or banlist row, matching docs/audits/BT19.md#knowledge-base-index (0 references).
 */

const PURPLE_TAMER_4 = "BT18-093"; // Violet Inboots: Purple Tamer, play cost 4 — the boundary hit
const PURPLE_TAMER_2 = "BT3-096"; // Mimi Tachikawa: Purple Tamer, play cost 2 — quiet, no [On Play]
const PURPLE_TAMER_5 = "BT11-094"; // Mirei Mikagura: Purple/Yellow Tamer, play cost 5 — over the cap
const RED_TAMER_2 = "ST1-12"; // Tai Kamiya: Red Tamer, play cost 2 — wrong colour
const PURPLE_EGG = "BT2-007"; // Pagumon: Purple Lv.2 Digi-Egg — the legal evolution source
const GREEN_EGG = "BT1-007"; // Tanemon: Green Lv.2 Digi-Egg — illegal source
const PLAIN_LV3 = "BT1-009"; // Monodramon: Red Lv.3, no effects
const INERT_SECURITY = "BT1-010";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"];

describe("BT19-067 Impmon", () => {
  it("matches the catalog printing and compiles both clauses with no residual", () => {
    expect(getCardDefinition("BT19-067")).toMatchObject({
      cardId: "BT19-067",
      nameEn: "Impmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      effectText:
        "[On Play] If you have 1 or fewer Tamers, you may play 1 purple Tamer with a play cost of 4 or less from your trash without paying the cost.",
      inheritedEffectText: "＜Retaliation＞.",
    });

    const card = runtimeCompiledCard("BT19-067");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "PlayWithoutCost",
            // A trash-zone (loose card) matcher reads the scalar `playCostLte` key; the object
            // `playCost: {op,value}` form is silently dropped for loose cards
            // (interpreter/matching/definition.ts).
            target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
            from: ["trash"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Retaliation" }] },
    ]);
    expect(card?.digivolutionRequirement ?? []).toEqual([]);
  });

  it("plays a purple play-cost-4 Tamer free from trash with no Tamers in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-067", as: "imp" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          trash: [{ card: PURPLE_TAMER_4, as: "violet" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const violetId = s.inst("violet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === violetId));

    const tamer = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === violetId);
    expect(tamer?.topCard?.cardId).toBe(PURPLE_TAMER_4);
    expect(tamer?.stack).toHaveLength(0);
    // Only Impmon's own play cost of 4 was paid; the Tamer came down for free.
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(violetId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId).sort()).toEqual(
      ["BT19-067", PURPLE_TAMER_4].sort(),
    );
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("still fires on the boundary: exactly 1 Tamer is '1 or fewer'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_TAMER_2, as: "existingTamer" }],
          hand: [
            { card: "BT19-067", as: "imp" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          trash: [{ card: PURPLE_TAMER_4, as: "violet" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const violetId = s.inst("violet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === violetId));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId).sort()).toEqual(
      ["BT19-067", PURPLE_TAMER_2, PURPLE_TAMER_4].sort(),
    );
    expect(s.state.memory).toBe(6);
  });

  it("does not fire with 2 Tamers already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: PURPLE_TAMER_2, as: "tamerOne" },
            { card: RED_TAMER_2, as: "tamerTwo" },
          ],
          hand: [
            { card: "BT19-067", as: "imp" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          trash: [{ card: PURPLE_TAMER_4, as: "violet" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const violetId = s.inst("violet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-067"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(violetId);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.memory).toBe(6);
  });

  it("ignores near-miss trash Tamers: play cost 5 purple and a play-cost-2 red", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-067", as: "imp" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          trash: [
            { card: PURPLE_TAMER_5, as: "tooExpensive" },
            { card: RED_TAMER_2, as: "wrongColour" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const expensiveId = s.inst("tooExpensive").instanceId;
    const wrongColourId = s.inst("wrongColour").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-067"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [expensiveId, wrongColourId].sort(),
    );
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-067"]);
    expect(s.state.memory).toBe(6);
  });

  it("is optional: declining leaves the Tamer in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-067", as: "imp" },
            { card: PLAIN_LV3, as: "spare" },
          ],
          trash: [{ card: PURPLE_TAMER_4, as: "violet" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const violetId = s.inst("violet").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("imp").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-067"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([violetId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-067"]);
    expect(s.state.memory).toBe(6);
  });

  it("grants its host ＜Retaliation＞ as an inherited effect, and a bare peer keeps none", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: PLAIN_LV3, as: "carrier", dp: 3000, under: ["BT19-067"] },
          { card: PLAIN_LV3, as: "bare", dp: 3000 },
        ],
        deck: DECK,
        security: [{ card: INERT_SECURITY, as: "own" }],
      },
      1: {
        battleArea: [
          { card: PLAIN_LV3, as: "wallOne", dp: 5000, suspended: true },
          { card: PLAIN_LV3, as: "wallTwo", dp: 5000, suspended: true },
        ],
        security: [{ card: INERT_SECURITY, as: "sec" }],
        deck: DECK,
      },
    });
    await s.ready();

    // Stack proof: identical printed cards, differing only by the digivolution card underneath.
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bare"), "Retaliation")).toBe(false);

    // The carrier loses the battle 3000 vs 5000; ＜Retaliation＞ deletes the winning defender too.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wallOne").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.instanceId)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // Control: the bare peer loses the same battle and the defender survives.
    const wallTwoId = s.perm("wallTwo").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bare").permanentId,
        target: { kind: "permanent", permanentId: wallTwoId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([wallTwoId]);
  });

  it("digivolves for 0 from a purple Lv.2 only — a green Lv.2 source is refused", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: PURPLE_EGG, as: "egg" },
        hand: [{ card: "BT19-067", as: "imp" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const eggId = s.perm("egg").topCard!.instanceId;
    const impId = s.inst("imp").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: impId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "BT19-067");

    // Evo cost 0, plus the mandatory digivolution draw.
    expect(s.state.memory).toBe(5);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("refuses a green Lv.2 evolution source on both the normal and alternate route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: GREEN_EGG, as: "green" },
        hand: [{ card: "BT19-067", as: "imp" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const impId = s.inst("imp").instanceId;

    for (const useAlternateCost of [false, true]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("green").permanentId,
          instanceId: impId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([impId]);
    expect(s.perm("green").topCard?.cardId).toBe(GREEN_EGG);
  });
});
