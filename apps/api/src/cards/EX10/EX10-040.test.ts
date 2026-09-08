import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-040.js";
import "../index.js";

const CARD_ID = "EX10-040";

// BT1-009 Monodramon, BT1-013 Muchomon and BT1-014 Kokatorimon print no main, inherited or
// security text, so nothing in a deck, trash or security stack built from them can fire.
const INERT_LV3 = "BT1-009";
const INERT_LV3_ALT = "BT1-013";
const INERT_LV4 = "BT1-014";
// BT4-082 Dobermon: purple Lv.4, 7000 DP, no main, inherited or security text — the
// smallest legal digivolution target for this card's printed Purple Lv.3 requirement.
const PURPLE_LV4 = "BT4-082";

/** A deck deep enough to survive the turn draw plus repeated milling, in a known order. */
const deck = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({ card: INERT_LV3, as: `${prefix}${index}` }));

/** A seat that can sit in a real turn loop: a playable card in hand, security and deck. */
const neutralSeat = () => ({ hand: [INERT_LV3_ALT], security: [INERT_LV3, INERT_LV3, INERT_LV3] });

const ids = (cards: Iterable<{ instanceId: string }>) => Array.from(cards, ({ instanceId }) => instanceId);

describe("EX10-040 DemiDevimon", () => {
  it("records the exact catalog and both printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "DemiDevimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
      effectText:
        "[Start of Your Main Phase] If your opponent has 10 or fewer cards in their trash, " +
        "trash the top 2 cards of both players' decks. Then, if they have 10 or more cards " +
        "in their trash, gain 1 memory.",
      inheritedEffectText: "[When Attacking] [Once Per Turn] Trash the top card of both players' decks.",
    });
    expect(getCardDefinition(CARD_ID)!.securityEffectText).toBeUndefined();
  });

  it("carries both clauses as IR with the two conditions on SEPARATE actions", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    // The mill and the memory gain are two independently gated actions, not one nested
    // clause: Q5121 needs the memory gain to run even when the mill's gate is false.
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }],
    });
  });

  it("Q5120: 8 opposing trash cards — mills 2 from BOTH decks, then gains 1 memory", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: CARD_ID, as: "demi" }], deck: deck(6, "my") },
      1: { ...neutralSeat(), deck: deck(6, "op"), trash: deck(8, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Exact endpoints: the top 2 of each deck moved, in top-first order, into each trash.
    expect(ids(s.state.players[0]!.trash)).toEqual([s.inst("my0").instanceId, s.inst("my1").instanceId]);
    expect(ids(s.state.players[1]!.trash).slice(8)).toEqual([s.inst("op0").instanceId, s.inst("op1").instanceId]);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    // The gate is re-read AFTER the mill: 8 + 2 = 10 is "10 or more", so memory is gained.
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5121: 11 opposing trash cards — mills nothing, yet still gains 1 memory", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: CARD_ID, as: "demi" }], deck: deck(6, "my") },
      1: { ...neutralSeat(), deck: deck(6, "op"), trash: deck(11, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // FAILS WHEN REVERTED: nesting the memory gain inside the mill's condition (or aborting
    // the action list on a failed gate) leaves memory at 0 here.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(11);
    expect(ids(s.state.players[1]!.deck).slice(0, 2)).toEqual([s.inst("op0").instanceId, s.inst("op1").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("boundary: exactly 10 opposing trash cards still mills (10 or FEWER)", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: CARD_ID, as: "demi" }], deck: deck(6, "my") },
      1: { ...neutralSeat(), deck: deck(6, "op"), trash: deck(10, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(12);
    expect(s.state.memory).toBe(1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("boundary: 7 opposing trash cards mills but does NOT reach 10, so no memory is gained", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: CARD_ID, as: "demi" }], deck: deck(6, "my") },
      1: { ...neutralSeat(), deck: deck(6, "op"), trash: deck(7, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(9);
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Start of YOUR Main Phase] does not fire on the opponent's turn", async () => {
    const s = setupEngine({
      0: { ...neutralSeat(), battleArea: [{ card: CARD_ID, as: "demi" }], deck: deck(8, "my") },
      1: { ...neutralSeat(), deck: deck(8, "op"), trash: deck(8, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const myTrashAfterMyTurn = s.state.players[0]!.trash.length;
    const opponentTrashAfterMyTurn = s.state.players[1]!.trash.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.trash).toHaveLength(myTrashAfterMyTurn);
    expect(s.state.players[1]!.trash).toHaveLength(opponentTrashAfterMyTurn);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the main clause is main text only: it does not fire from under a host", async () => {
    const s = setupEngine({
      0: {
        ...neutralSeat(),
        battleArea: [{ card: INERT_LV4, as: "host", under: [{ card: CARD_ID, as: "demi" }] }],
        deck: deck(6, "my"),
      },
      1: { ...neutralSeat(), deck: deck(6, "op"), trash: deck(8, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(8);
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reaches the stack through the real digivolve route, and the inherited clause then fires", async () => {
    const s = setupEngine({
      0: {
        ...neutralSeat(),
        hand: [INERT_LV3_ALT, { card: PURPLE_LV4, as: "dobermon" }],
        battleArea: [{ card: CARD_ID, as: "demi" }],
        deck: deck(8, "my"),
      },
      1: { ...neutralSeat(), deck: deck(8, "op"), trash: deck(11, "seed") },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const demiId = s.inst("demi").instanceId;
    const dobermonId = s.inst("dobermon").instanceId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("demi").permanentId, instanceId: dobermonId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("demi").topCard?.instanceId === dobermonId);

    // The printed Purple Lv.3 requirement at cost 2 was paid, and DemiDevimon is now the
    // digivolution card beneath Dobermon.
    expect(s.state.memory).toBe(1);
    expect(ids(s.perm("demi").stack)).toEqual([demiId]);
    expect(s.perm("demi").currentDP).toBe(getCardDefinition(PURPLE_LV4)!.dp);
    const myTrashBefore = s.state.players[0]!.trash.length;
    const opponentDeckBefore = s.state.players[1]!.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demi").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === myTrashBefore + 1);

    expect(s.state.players[1]!.deck).toHaveLength(opponentDeckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("refuses an illegal digivolution source: a red Lv.3 cannot carry the purple Lv.4", async () => {
    const s = setupEngine({
      0: {
        ...neutralSeat(),
        hand: [INERT_LV3_ALT, { card: PURPLE_LV4, as: "dobermon" }],
        battleArea: [{ card: INERT_LV3, as: "redLv3" }],
        deck: deck(8, "my"),
      },
      1: { ...neutralSeat(), deck: deck(8, "op") },
    });
    await s.ready();
    s.state.memory = 3;

    const rejected = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("redLv3").permanentId,
      instanceId: s.inst("dobermon").instanceId,
    });
    expect(rejected.ok).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.perm("redLv3").stack).toHaveLength(0);
  });

  it("inherited [When Attacking] mills 1 from both decks on a real attack, once per turn", async () => {
    const s = setupEngine({
      0: {
        ...neutralSeat(),
        battleArea: [{ card: INERT_LV4, as: "host", under: [{ card: CARD_ID, as: "demi" }] }],
        deck: deck(8, "my"),
      },
      1: { ...neutralSeat(), deck: deck(8, "op"), security: [INERT_LV3, INERT_LV3, INERT_LV3] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const myDeckBefore = s.state.players[0]!.deck.length;
    const opponentDeckBefore = s.state.players[1]!.deck.length;
    const opponentTrashBefore = s.state.players[1]!.trash.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    // Exactly one card left each deck. The opponent's trash also holds the checked security
    // card, so it is asserted as the mill plus that one card.
    expect(ids(s.state.players[0]!.trash)).toEqual([s.inst("my0").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore - 1);
    expect(s.state.players[1]!.deck).toHaveLength(opponentDeckBefore - 1);
    expect(s.state.players[1]!.trash.length).toBe(opponentTrashBefore + 2);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // [Once Per Turn] resets on the NEXT own turn: the attacker unsuspends and the mill runs
    // a second time. The same-turn refusal cannot be reached through public intents — the
    // attacker is suspended and no fixture card can unsuspend it, so it is not asserted here.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const myTrashAfterFirstTurn = s.state.players[0]!.trash.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === myTrashAfterFirstTurn + 1);

    expect(s.state.players[0]!.trash.length).toBe(myTrashAfterFirstTurn + 1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
