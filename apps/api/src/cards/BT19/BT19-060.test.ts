import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

/**
 * BT19-060 Strikedramon — Black Lv.4 Champion, 5000 DP, play cost 5,
 * evo cost 2 from a Black Lv.3.
 *
 * Printed clauses:
 *   1. [When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Ryo Akiyama]
 *      from your hand without paying the cost.                              (main)
 *   2. [All Turns] This Digimon gets +1000 DP.                              (inherited)
 *
 * KB: `node tools/kb/query.mjs card BT19-060` reports no knowledge-base entries —
 * no Q&A, errata or banlist row, matching docs/audits/BT19.md#knowledge-base-index.
 */

const RYO = "BT19-086"; // Ryo Akiyama: Black Tamer — the exact [Ryo Akiyama] the clause names
const OTHER_TAMER = "BT19-083"; // Rika Nonaka: Yellow Tamer — near-miss peer, wrong name
const PLAIN_LV4_PEER = "BT1-014"; // Kokatorimon: Red Lv.4, 4000 DP, no effects
const BLACK_LV3 = "BT2-052"; // Hagurumon: Black Lv.3, 3000 DP, no effects
const GREEN_LV3 = "BT1-064"; // Goblimon: Green Lv.3, 3000 DP, no effects — illegal source
const RED_LV3 = "BT1-009"; // Monodramon: Red Lv.3, 3000 DP, no effects — illegal source
const INERT_SECURITY = "BT1-009";
const DECK = ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013"];

describe("BT19-060 Strikedramon", () => {
  it("matches the catalog printing and compiles both clauses with no residual", () => {
    expect(getCardDefinition("BT19-060")).toMatchObject({
      cardId: "BT19-060",
      nameEn: "Strikedramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dragonkin"],
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      effectText:
        "[When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Ryo Akiyama] from your hand without paying the cost.",
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });

    const card = runtimeCompiledCard("BT19-060");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            // Bracketed [Ryo Akiyama] is an EXACT name reference, not a substring gate.
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ryo Akiyama"], match: "nameExact" }] } },
            from: ["hand"],
            payCost: false,
            condition: { kind: "permanentCount", seat: "mine", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
            optional: true,
          },
        ],
      },
      // Printed "[All Turns]" must compile to the AllTurns trigger, not Static.
      { trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000 }] },
    ]);
    expect(card?.digivolutionRequirement ?? []).toEqual([]);
  });

  it("plays [Ryo Akiyama] free from hand when you control no Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "base" }],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: RYO, as: "ryo" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const baseId = s.perm("base").topCard!.instanceId;
    const ryoId = s.inst("ryo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ryoId));

    const ryoPermanent = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === ryoId);
    expect(ryoPermanent?.topCard?.cardId).toBe(RYO);
    expect(ryoPermanent?.stack).toHaveLength(0);
    // Only the digivolve cost of 2 was paid; the Tamer came down for free.
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-060");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-012"]); // the digivolve draw
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("still fires on the boundary: exactly 1 Tamer is '1 or fewer'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BLACK_LV3, as: "base" },
            { card: OTHER_TAMER, as: "existingTamer" },
          ],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: RYO, as: "ryo" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ryoId = s.inst("ryo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ryoId));

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId).sort()).toEqual(
      ["BT19-060", OTHER_TAMER, RYO].sort(),
    );
    expect(s.state.memory).toBe(4);
  });

  it("does not fire with 2 Tamers already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BLACK_LV3, as: "base" },
            { card: OTHER_TAMER, as: "tamerOne" },
            { card: RYO, as: "tamerTwo" },
          ],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: RYO, as: "ryo" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ryoId = s.inst("ryo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-060");
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(ryoId);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.memory).toBe(4);
  });

  it("does not play a near-miss Tamer whose name is not exactly [Ryo Akiyama]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "base" }],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: OTHER_TAMER, as: "rika" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const rikaId = s.inst("rika").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-060");
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(rikaId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-060"]);
  });

  it("is optional: declining leaves [Ryo Akiyama] in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "base" }],
          hand: [
            { card: "BT19-060", as: "strike" },
            { card: RYO, as: "ryo" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ryoId = s.inst("ryo").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("strike").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-060");
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(ryoId);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-060"]);
    expect(s.state.memory).toBe(4);
  });

  it("gives its host +1000 DP as an inherited effect on both players' turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: PLAIN_LV4_PEER, as: "host", under: ["BT19-060"] },
          { card: PLAIN_LV4_PEER, as: "bare" },
        ],
        deck: DECK,
        security: [{ card: INERT_SECURITY, as: "own" }],
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Stack proof: identical printed cards, differing only by the digivolution card underneath.
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("bare").currentDP).toBe(4000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // [All Turns], so the bonus survives the hand-over to the opponent's turn.
    expect(s.state.turnSeat).toBe(1);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("bare").currentDP).toBe(4000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves for 2 from a Black Lv.3 only — Green and Red Lv.3 sources are refused", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: BLACK_LV3, as: "black" },
          { card: GREEN_LV3, as: "green" },
          { card: RED_LV3, as: "red" },
        ],
        hand: [{ card: "BT19-060", as: "strike" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 6;
    await s.ready();
    const blackBaseId = s.perm("black").topCard!.instanceId;
    const strikeId = s.inst("strike").instanceId;

    for (const alias of ["green", "red"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: strikeId,
          useAlternateCost: true,
        }),
      ).not.toEqual({ ok: true });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: strikeId,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([strikeId]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("black").permanentId,
        instanceId: strikeId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("black").topCard?.cardId === "BT19-060");

    expect(s.state.memory).toBe(4);
    expect(s.perm("black").stack.map((card) => card.instanceId)).toEqual([blackBaseId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-012"]);
  });
});
