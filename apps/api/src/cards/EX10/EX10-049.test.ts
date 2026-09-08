import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-049.js";
import "../index.js";

const CARD_ID = "EX10-049";

/**
 * EX10-049 SkullSatamon (Purple Lv.5 Ultimate, Virus, [Undead]/[Fallen Angel], 8000 DP).
 *
 * Main:      ＜Blocker＞
 *            [When Digivolving] [On Deletion] If your opponent has 10 or fewer cards in
 *            their trash, trash the top 3 cards of both players' decks. Then, delete 1 of
 *            your opponent's level 3 or lower Digimon. If your opponent has 10 or more
 *            cards in their trash, add 2 to this effect's level maximum.
 * Inherited: [When Attacking] [Once Per Turn] This Digimon gains ＜Security A. +1＞ for the
 *            turn. If your opponent has 10 or fewer cards in their trash, instead trash the
 *            top 2 cards of both players' decks.
 *
 * Every clause below is proved through public intents (digivolve, attack, declareBlock)
 * and the real turn loop. The trash thresholds are re-read at each process,
 * per comprehensive rules §15-6-2 and KB Q5395; the inherited "instead" is the exclusive
 * replacement KB Q5132 describes.
 *
 * Fixtures are fully inert main-deck Digimon: BT1-009 (Lv.3), BT1-013 (Lv.3), BT1-014
 * (Lv.4), BT1-020 (Lv.5), BT1-080 (Lv.6), BT4-080 Bakemon (Purple Lv.4, the legal
 * digivolution source).
 */
describe("EX10-049 SkullSatamon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "SkullSatamon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead", "Fallen Angel"],
      maxCountInDeck: 4,
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toContain("＜Blocker＞");
    expect(definition.effectText).toContain("add 2 to this effect's level maximum");
    expect(definition.inheritedEffectText).toContain("[When Attacking] [Once Per Turn]");
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("records the compiled contract: Blocker, the twin timings, and the inherited OPT", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Blocker" }],
    });
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "both",
            amount: 3,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
          },
          {
            kind: "ConditionalBranch",
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            ifTrue: [{ kind: "Delete", target: { count: 1, filter: { levelComparison: { op: "lte", value: 5 } } } }],
            ifFalse: [{ kind: "Delete", target: { count: 1, filter: { levelComparison: { op: "lte", value: 3 } } } }],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gt", value: 10 },
        },
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
        },
      ],
    });
  });

  it("[When Digivolving] at a low trash count: mills 3 each, then deletes only a level 3 or lower", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "lv3" },
            { card: "BT1-020", as: "lv5" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-080"],
          trash: Array.from({ length: 6 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const bakemonInstanceId = s.perm("bakemon").topCard!.instanceId;
    const lv3Id = s.perm("lv3").permanentId;
    const lv5Id = s.perm("lv5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    // Digivolving paid 3 memory and drew 1; the mill then took 3 more from my deck.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    // 6 seeded + 3 milled + the deleted Lv.3 (its whole stack) = 10.
    expect(s.state.players[1]!.trash).toHaveLength(10);

    // The post-mill count is 9, still below 10, so the level maximum stays at 3: the Lv.5
    // was never a legal target and survives.
    const survivors = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(survivors).toEqual([lv5Id]);
    expect(survivors).not.toContain(lv3Id);

    const skull = s.perm("bakemon");
    expect(skull.topCard!.cardId).toBe(CARD_ID);
    expect(skull.stack.map((card) => card.instanceId)).toEqual([bakemonInstanceId]);
    expect(observe(s.engine).hasKeyword(skull, "Blocker")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("re-reads the trash after the mill (§15-6-2): 8 + 3 milled reaches 10 and raises the maximum to 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "lv5" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-080"],
          trash: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const lv5Id = s.perm("lv5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 30);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-080"]);
    // 8 seeded + 3 milled = 11 when the delete is processed, so the Lv.5 is in range.
    expect(s.state.players[1]!.trash).toHaveLength(12);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv5Id);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5395: above 10 the mill is skipped, but the 'then' delete still runs at the raised maximum", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "lv5" },
            { card: "BT1-080", as: "lv6" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const lv5Id = s.perm("lv5").permanentId;
    const lv6Id = s.perm("lv6").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle(() => false, 30);

    // Neither deck was milled: the first process's condition failed. Only the digivolve draw
    // moved a card out of my deck.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    // 11 seeded + the deleted Lv.5 = 12.
    expect(s.state.players[1]!.trash).toHaveLength(12);
    // The maximum is 5, not 7: the Lv.6 was never a legal target.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([lv6Id]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv5Id);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("no legal target: the delete is a silent no-op and leaves no pending decision", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "bakemon" }],
          hand: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "lv6" }],
          deck: ["BT1-009", "BT1-013", "BT1-014"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bakemon").permanentId,
        instanceId: s.inst("skull").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bakemon").topCard?.cardId === CARD_ID);
    await settle(() => false, 40);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Blocker＞ into a bigger attacker: the block redirects the attack and [On Deletion] fires", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "skull" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "attacker", dp: 20_000 },
            { card: "BT1-013", as: "lv3" },
          ],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020"],
          trash: Array.from({ length: 6 }, () => "BT1-009"),
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const lv3Id = s.perm("lv3").permanentId;
    const skullId = s.perm("skull").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("skull"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: skullId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle(() => false, 40);

    // The block redirected the attack, so my security was never checked.
    expect(s.state.players[0]!.security).toHaveLength(2);
    // 8000 lost to 20000: SkullSatamon was deleted, and [On Deletion] then milled 3 each
    // (opponent trash 6 -> 9) and deleted their Lv.3.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-020"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(lv3Id);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5132 inherited: at 10 or fewer the mill REPLACES ＜Security A. +1＞, so only 1 card is checked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013"],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // The opponent controls no ＜Blocker＞, so no block window opens and the attack runs
    // straight through its [When Attacking] timing into the security check.
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 40);

    // The replacement branch ran: 2 cards off each deck, no Security Attack grant.
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-014"]);
    // Exactly 1 security card checked, so 1 remains.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("Q5132 inherited: above 10 the standard processing stands, granting ＜Security A. +1＞ for 2 checks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-013"],
        trash: Array.from({ length: 11 }, () => "BT1-009"),
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 40);

    // Neither deck was milled; both security cards were checked instead.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("inherited [Once Per Turn]: one grant per turn on the same carrier, reset on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", as: "host", dp: 20_000, under: [{ card: CARD_ID }] }],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080", "BT1-009", "BT1-013", "BT1-014"],
        hand: ["BT1-009"],
        security: ["BT1-009", "BT1-013", "BT1-014"],
      },
      1: {
        battleArea: [{ card: "BT1-014", as: "theirs", dp: 20_000 }],
        deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-020", "BT1-080", "BT1-009", "BT1-013", "BT1-014"],
        hand: ["BT1-009"],
        security: Array.from({ length: 7 }, () => "BT1-009"),
        trash: Array.from({ length: 12 }, () => "BT1-009"),
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const attack = async (remainingSecurity: number): Promise<void> => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === remainingSecurity);
      await settle(() => false, 30);
    };

    // The opponent's trash stays above 10 all game, so the standard ＜Security A. +1＞
    // processing runs and the "instead" mill never applies.
    const myDeckBefore = s.state.players[0]!.deck.length;
    await attack(5);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore);

    // Same turn, same carrier. `verb.unsuspend` is the only seam that returns an attacker to
    // unsuspended mid-turn; the attack itself is still the public intent. A second grant would
    // stack to 2 — [Once Per Turn] holds it at 1.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await attack(3);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // "for the turn" expired through the real turn loop, and the gate reset: the grant is
    // re-applied to exactly 1, not carried over as 2.
    await attack(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
