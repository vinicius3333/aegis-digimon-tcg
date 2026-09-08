import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-044.js";
import "../index.js";

/**
 * EX10-044 Damemon (Purple, Lv.4 Champion, [Mutant]/[Bagra Army]).
 *
 * Printed clauses
 *   1. [On Play] By placing 1 [Bagra Army] trait Digimon card from your hand or trash under
 *      any of your Tamers, ＜Draw 1＞
 *   2. [On Deletion] You may play 1 [Tuwarmon] with a play cost of 7 or less from under your
 *      Tamers without paying the cost. Then, ＜Save＞
 *   3. Inherited: When effects trash this card from a [Bagra Army] trait Digimon's
 *      digivolution cards, ＜Draw 1＞
 *
 * Rulings covered
 *   Q5126 — a card placed under a Tamer that already holds cards goes to the BOTTOM.
 *   Q5160 — see the report: not reachable through the public seam.
 *
 * Fixtures: EX10-064 Yuu Amano & Nene Amano (the Purple [Bagra Army] Tamer host),
 * EX10-026 SkullKnightmon ([Bagra Army] placement fodder — only ever placed, never played),
 * BT11-082 Tuwarmon (play cost exactly 7 — the ≤7 boundary, no [On Play] text),
 * BT1-038 Monzaemon (6000 DP, no text — the battle wall that deletes Damemon),
 * BT1-013 / BT1-014 (inert main-deck Digimon used as stack filler, hand fodder and deck).
 */
const CARD_ID = "EX10-044";

describe("EX10-044 Damemon", () => {
  it("matches the catalog and compiles both bottom placements", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Damemon",
      colors: ["Purple"],
      level: 4,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mutant", "Bagra Army"],
    });
    // The catalog string carries a non-breaking space before the keyword; compare on
    // normalized whitespace so the assertion is about the wording, not the separator.
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText?.replace(/\s+/g, " ")).toBe(
      "When effects trash this card from a [Bagra Army] trait Digimon's digivolution cards, ＜Draw 1＞",
    );
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // Q5126 / Comprehensive Rules 4-3: both placements land at the BOTTOM of the Tamer stack.
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: { from: ["hand", "trash"], count: 1 },
            underFilter: { controller: "mine", kind: ["Tamer"] },
            position: "bottom",
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["underTamers"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 7, nameOrTrait: [{ tokens: ["Tuwarmon"], match: "name" }] } },
        },
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          position: "bottom",
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("[On Play] Q5126: the placed [Bagra Army] card lands at the BOTTOM of the Tamer, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-026", as: "material" },
            { card: "BT1-013", as: "notBagra" },
          ],
          battleArea: [
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const damemonId = s.inst("damemon").instanceId;
    const materialId = s.inst("material").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: damemonId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 3 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    // Play cost 4 paid from memory 4.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
      damemonId,
    ]);
    // `Permanent.stack` is bottom-first: the newly placed card must be index 0, under both
    // cards that were already there.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      materialId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    // The non-[Bagra Army] hand card was never a candidate; the draw replaced the spent card.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("notBagra").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play]: with no [Bagra Army] card available the cost is unpayable, so nothing is placed or drawn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "damemon" },
            { card: "BT1-013", as: "notBagra" },
          ],
          battleArea: [{ card: "EX10-064", as: "tamer", under: [{ card: "BT1-014", as: "older" }] }],
          trash: [{ card: "BT1-013", as: "trashFodder" }],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("damemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("older").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("notBagra").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashFodder").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: a battle deletion plays the cost-7 Tuwarmon free, then Saves at the BOTTOM", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT11-082", as: "tuwarmon" },
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;
    const damemonId = s.inst("damemon").instanceId;
    const tuwarmonId = s.inst("tuwarmon").instanceId;

    // 3000 DP into a 6000 DP wall: Damemon loses the battle and is deleted.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    // The Tuwarmon left the Tamer stack and is on the board, played without paying its cost.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
      tuwarmonId,
    ]);
    expect(s.state.memory).toBe(1);
    // Q5126 / CR 4-3: the saved Damemon goes under the cards already stacked there.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      damemonId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(damemonId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: with no [Tuwarmon] under the Tamer nothing is played, but ＜Save＞ still resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            {
              card: "EX10-064",
              as: "tamer",
              under: [
                { card: "BT1-013", as: "older1" },
                { card: "BT1-014", as: "older2" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.instanceId)).toEqual([
      s.perm("tamer").topCard!.instanceId,
    ]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      damemonId,
      s.inst("older1").instanceId,
      s.inst("older2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion]: ＜Save＞ is optional — declining sends Damemon to the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-064", as: "tamer", under: [{ card: "BT1-013", as: "older" }] },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-038", as: "wall", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("damemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("older").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(damemonId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: a real digivolve stack whose [Bagra Army] host effect-trashes this card draws 1", async () => {
    // Public route only: play EX10-044, digivolve it into EX10-045 Tuwarmon ([Damemon]: Cost 1,
    // [Bagra Army]) whose [When Digivolving] pays "by trashing any 1 digivolution card of your
    // [Bagra Army] trait Digimon" — that trash is the inherited watcher's real trigger.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "damemon" }],
          hand: [
            { card: "EX10-045", as: "tuwarmon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [
            { card: "BT1-013", as: "evoDraw" },
            { card: "BT1-014", as: "inheritedDraw" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const damemonId = s.inst("damemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("damemon").permanentId,
        instanceId: s.inst("tuwarmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === damemonId));
    await settle(() => false, 30);

    // [Damemon]: Cost 1 — memory 3 - 1 = 2.
    expect(s.state.memory).toBe(2);
    expect(s.perm("damemon").topCard!.cardId).toBe("EX10-045");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(damemonId);
    // Evolution bonus draw plus the inherited ＜Draw 1＞.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("spare").instanceId,
      s.inst("evoDraw").instanceId,
      s.inst("inheritedDraw").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited: an effect trash from a non-[Bagra Army] host draws nothing", async () => {
    // Negative host axis. No public route trashes a digivolution card from an inert host, so
    // this uses the testkit verb; the positive case above carries the behavioural proof.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-014"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => false, 30);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);
  });
});
