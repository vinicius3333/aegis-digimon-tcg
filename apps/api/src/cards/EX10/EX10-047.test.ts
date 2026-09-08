import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-047.js";
import "../index.js";

const CARD_ID = "EX10-047";

/**
 * EX10-047 Arukenimon (Purple/Red, Lv.5 Ultimate, [Dark Animal], 6000 DP, play cost 6).
 *
 * [On Play] By trashing 1 card in your hand, delete up to 6000 DP total worth of your
 * opponent's Digimon.
 * [On Deletion] You may play 1 Tamer card with [Myotismon] in its text from your trash
 * without paying the cost. This effect can't play cards with the same name as any of
 * your Tamers.
 *
 * Every behavioural case below drives a public intent: `playCard` for [On Play] and a
 * real losing `attack` for [On Deletion]. No injected timing is used.
 */

/** Own Tamer on the field whose name blocks the same-named copy in the trash. */
const OWN_TAMER = "EX10-065"; // Yukio Oikawa — [Myotismon] in its text.
/** Trash Tamer sharing OWN_TAMER's name: matched by the text filter, blocked by the name rule. */
const SAME_NAME_TAMER = "BT8-093"; // Yukio Oikawa.
/** Trash Tamer with no [Myotismon] anywhere in its text: never a candidate. */
const OFF_TEXT_TAMER = "ST3-12"; // T.K. Takaishi.
/** Trash Tamer that is eligible: [Myotismon] in its effect text, name unused by our Tamers. */
const ELIGIBLE_TAMER = "BT16-089"; // Arukenimon & Mummymon.

describe("EX10-047 Arukenimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Arukenimon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
      // Catalog quirk, reported not edited: the space after "[Myotismon]" is a
      // non-breaking space (U+00A0) in cards.json. Spelled out so the assertion is exact.
      effectText:
        "[On Play] By trashing 1 card in your hand, delete up to 6000 DP total worth of your opponent's Digimon.\n[On Deletion] You may play 1 Tamer card with [Myotismon]\u00a0in its text from your trash without paying the cost. This effect can't play cards with the same name as any of your Tamers.",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles both printed clauses and nothing else", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual(["OnPlay", "OnDeletion"]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "DeleteByDPBudget",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          baseBudget: 6000,
          upTo: true,
          cost: {
            kind: "trash",
            target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }],
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
        },
      ],
    });
  });

  it("[On Play] played from hand: trashes 1 hand card and deletes 3000+3000, leaving the 4000", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "arukenimon" },
            { card: "BT1-013", as: "cost" },
          ],
          deck: ["BT1-014", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "smallA", dp: 3000 },
            { card: "BT1-009", as: "smallB", dp: 3000 },
            { card: "BT1-014", as: "survivor", dp: 4000 },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const survivorId = s.perm("survivor").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.players[1]!.battleArea.length === 1 &&
        s.state.pendingDecision === undefined,
    );

    // The budget is 6000 DP total and the greedy pass takes the cheapest first: 3000 + 3000
    // exactly fills it, so the 4000 no longer fits and survives.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([survivorId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-009"]);
    // Exactly the one hand card was paid; the hand is now empty and it is in MY trash.
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    // Play cost 6 came out of memory; nothing else moved.
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014", "BT1-014"]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("[On Play] boundary: a single 7000 DP Digimon exceeds the budget and is not deleted", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "arukenimon" },
            { card: "BT1-013", as: "cost" },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "tooBig", dp: 7000 }], deck: ["BT1-014"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const tooBigId = s.perm("tooBig").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([tooBigId]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // "By trashing" is a processing condition of a used effect: the cost is paid even though
    // the greedy budget pass could select nothing.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] declining keeps the hand card and the whole opposing board", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "arukenimon" },
            { card: "BT1-013", as: "cost" },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "small", dp: 3000 }], deck: ["BT1-014"], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;
    const smallId = s.perm("small").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([smallId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] with an empty opposing board still pays the hand cost and deletes nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "arukenimon" },
            { card: "BT1-013", as: "cost" },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arukenimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID) &&
        s.state.pendingDecision === undefined,
    );

    // "Up to" allows selecting zero, so using the effect with no opposing Digimon is legal
    // and still pays: the hand card goes to the trash and nothing else happens.
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves onto a Red Lv.4 source for 4 memory, keeping the source under it, and draws the bonus", async () => {
    const s = setupEngine(
      {
        0: {
          // BT1-014 Kokatorimon: inert Red Lv.4, 4000 DP — a legal printed route source.
          battleArea: [{ card: "BT1-014", as: "base", dp: 4000 }],
          hand: [{ card: CARD_ID, as: "arukenimon" }],
          deck: [
            { card: "BT1-013", as: "bonus" },
            { card: "BT1-009", as: "next" },
          ],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const basePermanentId = s.perm("base").permanentId;
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("arukenimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID && s.state.pendingDecision === undefined);

    // Same permanent, new top card: the printed Red Lv.4 route for 4 memory.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([basePermanentId]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("arukenimon").instanceId);
    expect(s.state.memory).toBe(0);
    // Source-stack identity: `Permanent.stack` holds only the cards beneath the top card.
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    // DP is now Arukenimon's printed 6000, not the source's 4000.
    expect(s.perm("base").currentDP).toBe(6000);
    // The evolution bonus drew exactly the aliased top card of the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonus").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("next").instanceId]);
    // Digivolving is not playing: [On Play] never fired, so nothing was trashed or deleted.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal source: a Red Lv.3 does not satisfy either printed Lv.4 route", async () => {
    const s = setupEngine(
      {
        0: {
          // BT1-013 Muchomon: inert Red, but level 3 — one level short of both routes.
          battleArea: [{ card: "BT1-013", as: "tooLow", dp: 5000 }],
          hand: [{ card: CARD_ID, as: "arukenimon" }],
          deck: [{ card: "BT1-009", as: "top" }],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // Ample memory, so the refusal can only be the source requirement, not the cost.
    s.state.memory = 10;
    const tooLowInstanceId = s.perm("tooLow").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tooLow").permanentId,
        instanceId: s.inst("arukenimon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    await settle(() => false, 30);

    expect(s.perm("tooLow").topCard.instanceId).toBe(tooLowInstanceId);
    expect(s.perm("tooLow").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("arukenimon").instanceId]);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("top").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] Q5129: a losing attack plays the [Myotismon]-in-text Tamer from trash for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "arukenimon" },
            { card: OWN_TAMER, as: "ownTamer" },
          ],
          trash: [
            { card: OFF_TEXT_TAMER, as: "offText" },
            { card: SAME_NAME_TAMER, as: "sameName" },
            { card: ELIGIBLE_TAMER, as: "eligible" },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const memoryBefore = s.state.memory;
    const arukenimonInstanceId = s.perm("arukenimon").topCard.instanceId;

    // Real combat deletion: 6000 DP into a suspended 20000 DP wall.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arukenimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === ELIGIBLE_TAMER) &&
        s.state.pendingDecision === undefined,
    );

    // Arukenimon lost and is in the trash; the wall survived.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([OWN_TAMER, ELIGIBLE_TAMER]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("offText").instanceId,
      s.inst("sameName").instanceId,
      arukenimonInstanceId,
    ]);
    // The eligible Tamer left the trash and is on the board as that exact instance.
    expect(s.state.players[0]!.battleArea.at(-1)!.topCard.instanceId).toBe(s.inst("eligible").instanceId);
    // Free play: no memory moved for the Tamer's cost of 4 (attacking does not move memory here).
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("[On Deletion] plays nothing when the trash holds only off-text and same-named Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "arukenimon" },
            { card: OWN_TAMER, as: "ownTamer" },
          ],
          trash: [
            { card: OFF_TEXT_TAMER, as: "offText" },
            { card: SAME_NAME_TAMER, as: "sameName" },
          ],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const arukenimonInstanceId = s.perm("arukenimon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arukenimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === arukenimonInstanceId) &&
        s.state.pendingDecision === undefined,
    );
    await settle(() => false, 30);

    // ST3-12 has no [Myotismon] anywhere; BT8-093 shares the field Tamer's name. Nothing plays.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([OWN_TAMER]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("offText").instanceId,
      s.inst("sameName").instanceId,
      arukenimonInstanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Deletion] is a 'may': declining leaves the eligible Tamer in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "arukenimon" },
            { card: OWN_TAMER, as: "ownTamer" },
          ],
          trash: [{ card: ELIGIBLE_TAMER, as: "eligible" }],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }],
          deck: ["BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const arukenimonInstanceId = s.perm("arukenimon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("arukenimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === arukenimonInstanceId) &&
        s.state.pendingDecision === undefined,
    );
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([OWN_TAMER]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("eligible").instanceId,
      arukenimonInstanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
