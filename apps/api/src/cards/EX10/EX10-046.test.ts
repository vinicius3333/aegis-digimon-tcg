import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-046.js";
import "../index.js";

const CARD_ID = "EX10-046";

/**
 * EX10-046 Devimon (Purple, Lv.4 Champion, [Fallen Angel]).
 *
 * Main: "[Start of Your Main Phase] [When Digivolving] If your opponent has 10 or fewer
 * cards in their trash, trash the top 2 cards of both players' decks. Then, if they have
 * 10 or more cards in their trash, you may return 1 card with the [Fallen Angel] or
 * [Undead] trait from your trash to the hand."
 * Inherited: "[When Attacking] [Once Per Turn] Trash the top card of both players' decks."
 *
 * The two conditions are independent gates on two actions, not one gate on a chain — see
 * Q5127 (8 in trash: mill, then the "then" clause still runs because milling pushed the
 * count to 10) and Q5128 (11 in trash: no mill, but the "then" clause still runs).
 *
 * Every behavioural case below drives production windows: the start-of-main-phase timing
 * through the real turn loop, [When Digivolving] through a public `digivolve` intent, and
 * the inherited clause through public `attack` intents.
 */
describe("EX10-046 Devimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Devimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Fallen Angel"],
      inheritedEffectText: "[When Attacking] [Once Per Turn] Trash the top card of both players' decks.",
    });
    expect(getCardDefinition(CARD_ID)!.effectText).toContain("[Start of Your Main Phase] [When Digivolving]");
    expect(getCardDefinition(CARD_ID)!.effectText).toContain("trash the top 2 cards of both players' decks");
    expect(getCardDefinition(CARD_ID)!.securityEffectText ?? "").toBe("");
  });

  it("records the compiled clause shape both triggers share", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "both",
            amount: 2,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
          },
          {
            kind: "Return",
            to: "hand",
            optional: true,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            target: {
              count: 1,
              filter: {
                controller: "mine",
                zone: "trash",
                nameOrTrait: [{ tokens: ["Fallen Angel", "Undead"], match: "trait" }],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }],
    });
  });

  it("Q5127: opponent at 8 in trash — mills 2 from both decks, then returns a [Fallen Angel] card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          trash: [
            { card: "BT6-076", as: "fallenAngel" },
            { card: "BT2-075", as: "undead" },
            { card: "BT1-009", as: "nonMatching" },
          ],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: Array.from({ length: 8 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("fallenAngel").instanceId);
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const deckBefore0 = p0.deck.length;
    const deckBefore1 = p1.deck.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => p0.hand.some(({ instanceId }) => instanceId === s.inst("fallenAngel").instanceId));

    // Both decks lost their top 2 cards; the opponent's trash rose from 8 to 10, which is
    // what makes the "then" clause's own >= 10 gate true (Q5127).
    expect(p1.deck).toHaveLength(deckBefore1 - 2);
    expect(p1.trash).toHaveLength(10);
    expect(p0.deck.length).toBeLessThanOrEqual(deckBefore0 - 2);

    // Exactly one card came back, and only an eligible trait was a candidate: the [Undead]
    // Myotismon and the non-matching Monodramon both stayed in the trash.
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fallenAngel").instanceId);
    const trashIds = p0.trash.map(({ instanceId }) => instanceId);
    expect(trashIds).toContain(s.inst("undead").instanceId);
    expect(trashIds).toContain(s.inst("nonMatching").instanceId);
    expect(trashIds).not.toContain(s.inst("fallenAngel").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5128: opponent at 11 in trash — no mill, but the [Undead] return still resolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [{ card: "BT2-075", as: "undead" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: Array.from({ length: 11 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const deckBefore1 = p1.deck.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => p0.hand.some(({ instanceId }) => instanceId === s.inst("undead").instanceId));

    // The mill was skipped (11 > 10) yet the "then" clause still ran (Q5128).
    expect(p1.deck).toHaveLength(deckBefore1);
    expect(p1.trash).toHaveLength(11);
    expect(p0.trash).toHaveLength(0);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("undead").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("boundary: opponent at 7 in trash — mills to 9, so the return clause never offers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [{ card: "BT6-076", as: "fallenAngel" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: Array.from({ length: 7 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const deckBefore1 = p1.deck.length;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => p1.trash.length === 9);
    await settle(() => false, 30);

    expect(p1.deck).toHaveLength(deckBefore1 - 2);
    expect(p1.trash).toHaveLength(9);
    // 9 < 10: nothing was returned and no prompt was raised, so the Fallen Angel stays put.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fallenAngel").instanceId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("fallenAngel").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the optional return leaves the trash untouched while the mandatory mill still happened", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [{ card: "BT6-076", as: "fallenAngel" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: Array.from({ length: 9 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => p1.trash.length === 11);
    await settle(() => false, 30);

    expect(p1.trash).toHaveLength(11);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fallenAngel").instanceId);
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("fallenAngel").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Digivolving]: the same clause fires on a public Lv.3 Purple digivolve route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-02", as: "base" }],
          hand: [{ card: CARD_ID, as: "devimon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: [{ card: "BT6-076", as: "fallenAngel" }],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          trash: Array.from({ length: 8 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const baseInstanceId = s.inst("base").instanceId;
    const deckBefore1 = p1.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("devimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.some(({ instanceId }) => instanceId === s.inst("fallenAngel").instanceId));

    // The evolution route itself: Devimon on top, the Lv.3 Purple base beneath it, and the
    // printed Cost 2 paid out of the 5 memory arranged above (plus the digivolve draw).
    const devimon = s.perm("base");
    expect(devimon.topCard!.cardId).toBe(CARD_ID);
    expect(devimon.stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.state.memory).toBe(3);

    expect(p1.deck).toHaveLength(deckBefore1 - 2);
    expect(p1.trash).toHaveLength(10);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fallenAngel").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal digivolve source: a Lv.3 of the wrong colour cannot become Devimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redBase" }],
        hand: [{ card: CARD_ID, as: "devimon" }, "BT1-009"],
        deck: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009", "BT1-013"], trash: Array.from({ length: 8 }, () => "BT1-009") },
    });
    await s.ready();
    s.state.memory = 5;
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("redBase").permanentId,
      instanceId: s.inst("devimon").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("redBase").topCard!.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.trash).toHaveLength(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("carries its inherited mill through a real stack: Lv.3 -> Devimon -> Lv.5, then attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-02", as: "base" }],
          hand: [{ card: CARD_ID, as: "devimon" }, { card: "BT4-085", as: "phantomon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          // 15 > 10 keeps the main clause's mill switched off, so the only deck movement
          // asserted after the attack belongs to the inherited clause.
          trash: Array.from({ length: 15 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 8;
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const baseInstanceId = s.inst("base").instanceId;
    const devimonInstanceId = s.inst("devimon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: devimonInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("phantomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-085");
    expect(s.state.memory).toBe(3);

    // Source-stack identity after both public routes: bottom-most Lv.3 first, Devimon
    // above it, the Lv.5 on top.
    const stack = s.perm("base");
    expect(stack.stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId, devimonInstanceId]);
    expect(stack.stack.map(({ cardId }) => cardId)).toEqual(["ST6-02", CARD_ID]);
    expect(stack.currentDP).toBe(10_000);

    const deck0Before = p0.deck.length;
    const deck1Before = p1.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: stack.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.deck.length === deck1Before - 1);
    await settle(() => observe(s.engine).isAttacking() === false);

    // Devimon is now a digivolution card, so only its inherited clause applies: 1 card off
    // each deck, and no main-clause mill of 2.
    expect(p0.deck).toHaveLength(deck0Before - 1);
    expect(p1.deck).toHaveLength(deck1Before - 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherited [When Attacking] [Once Per Turn]: mills once, refuses a second attack, resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 20_000, under: [{ card: CARD_ID, as: "devimon" }] }],
          hand: [{ card: "BT1-095", as: "unsuspend" }, "BT1-009"],
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const deck0AtMain = p0.deck.length;
    const deck1AtMain = p1.deck.length;

    // First attack of the turn: the inherited clause mills the top card of BOTH decks.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.deck.length === deck1AtMain - 1);
    await settle(() => observe(s.engine).isAttacking() === false);
    expect(p0.deck).toHaveLength(deck0AtMain - 1);
    expect(p1.deck).toHaveLength(deck1AtMain - 1);
    expect(s.perm("host").isSuspended).toBe(true);

    // Unsuspend the same host through a public option play so a SECOND real attack window
    // opens in the same turn — this is what the [Once Per Turn] gate has to refuse.
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended === false);
    const deck0AfterFirst = p0.deck.length;
    const deck1AfterFirst = p1.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isAttacking() === false);
    await settle(() => false, 30);
    expect(p0.deck).toHaveLength(deck0AfterFirst);
    expect(p1.deck).toHaveLength(deck1AfterFirst);

    // Next own turn through the real turn loop: the once-per-turn use has reset.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    const deck1NextTurn = p1.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.deck.length === deck1NextTurn - 1);
    expect(p1.deck).toHaveLength(deck1NextTurn - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
