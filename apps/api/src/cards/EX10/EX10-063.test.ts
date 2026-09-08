import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-063.js";
import "../index.js";

const CARD_ID = "EX10-063";

/**
 * EX10-063 Close (Black Tamer, play cost 3, [LIBERATOR]).
 *
 * [Start of Your Main Phase] By returning this Tamer to the bottom of the deck, you may play
 *   1 [Close] from your hand without paying the cost. Then, if you don't have a Digimon, you
 *   may play 1 [Sunarizamon] from your trash without paying the cost.
 * [All Turns] When effects trash any of your [Mineral] or [Rock] trait Digimon's digivolution
 *   cards, by suspending this Tamer, gain 1 memory.
 * [Security] Play this card without paying the cost.
 *
 * Every clause below is reached through a public intent or the real turn loop: the start-of-
 * main window comes from `startTurnLoop()`, the digivolution-card trash comes from playing
 * EX10-028 Landramon with `playCard`, and the Security effect comes from a real attack that
 * checks security. No injected timing (`advance.fire*`) is used.
 *
 * Fixtures: BT10-062 Golemon is the inert [Mineral] Digimon (no main and no inherited text);
 * BT1-019 DarkTyrannomon is the inert non-trait host; BT1-009/BT1-013/BT1-014 are inert
 * main-deck Digimon for decks, security and spare hand cards.
 */
const INERT_DECK = ["BT1-013", "BT1-014", "BT1-009"];
const SUNARIZAMON = "EX10-025";
const LANDRAMON = "EX10-028";
const INERT_MINERAL = "BT10-062";
// BT15-019 Crabmon: `[On Play] Trash the bottom digivolution card of 1 of your opponent's
// Digimon` — the opponent-turn route into this Tamer's [All Turns] watcher.
const OPPONENT_STACK_TRASHER = "BT15-019";
const PROGANOMON = "EX10-032";

describe("EX10-063 Close", () => {
  it("records the exact catalog and compiled IR contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Close",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["LIBERATOR"],
      maxCountInDeck: 4,
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    expect(compiled.effects?.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          // "[Close]" is a bracketed name: exact, never a substring match.
          target: { filter: { controller: "mine", zone: "hand", nameOrTrait: [{ match: "nameExact" }] } },
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "return", target: { filter: { isSelfRef: true }, isSelf: true }, to: "deckBottom" },
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", zone: "trash", nameOrTrait: [{ match: "nameExact" }] } },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "allOf",
            conditions: [
              // Q5173: the tail runs only when the "by" cost was actually paid.
              { kind: "ifThisEffectActed" },
              // CR 3-4-5-8: the breeding area is not referenced, so the count is battle-area only.
              { kind: "youHaveNone", filter: { controller: "mine", kind: ["Digimon"], zone: "battleArea" } },
            ],
          },
        },
      ],
    });

    expect(compiled.effects?.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          // The subject of the event is the HOST Digimon that lost the cards.
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    });

    expect(compiled.effects?.find(({ trigger }) => trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
    });
  });

  // --- [Start of Your Main Phase], through the real turn loop ---

  it("Q5173/Q5743 returns itself, plays the hand [Close], then the trash [Sunarizamon]; the new Close does not chain", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: CARD_ID, as: "replacement" },
            // A spare playable card so Main is not auto-passed before the window is observed.
            { card: "BT1-013", as: "spare" },
          ],
          trash: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.inst("source").instanceId;
    const replacementId = s.inst("replacement").instanceId;
    const sunaId = s.inst("suna").instanceId;
    const memoryBefore = s.state.memory;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    // The "by" cost: this Tamer went to the BOTTOM of the deck, not to the trash.
    expect(p0.deck.at(-1)!.instanceId).toBe(sourceId);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(sourceId);
    // Both plays landed, and neither cost memory ("without paying the cost").
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual([replacementId, sunaId].sort());
    expect(p0.hand.map(({ instanceId }) => instanceId)).not.toContain(replacementId);
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(sunaId);
    expect(s.state.memory).toBe(memoryBefore);
    // Q5743: the [Close] this effect just played does NOT get its own start-of-main window,
    // so exactly one Tamer was returned and the new one is still on the board.
    expect(p0.deck.filter(({ cardId }) => cardId === CARD_ID)).toHaveLength(1);
    expect(p0.battleArea.some(({ topCard }) => topCard.instanceId === replacementId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it('Q5173 declining the "by" cost leaves the Tamer, the hand [Close] and the trash [Sunarizamon] untouched', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [
            { card: CARD_ID, as: "replacement" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => false, 60);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("replacement").instanceId);
    // The tail is gated on the cost being paid, so the Sunarizamon stays in the trash.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("suna").instanceId]);
    // Nothing was returned to the bottom of the deck (the first turn player does not draw).
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it('"if you don\'t have a Digimon": a battle-area Digimon blocks only the tail, not the swap', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-009", as: "blockingDigimon" },
          ],
          hand: [
            { card: CARD_ID, as: "replacement" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.inst("source").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        s.state.players[0]!.deck.at(-1)?.instanceId === sourceId &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.length === 2,
    );

    const p0 = s.state.players[0]!;
    // The head clause still ran: the Tamer was swapped for the one in hand.
    expect(p0.deck.at(-1)!.instanceId).toBe(sourceId);
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("replacement").instanceId, s.perm("blockingDigimon").topCard.instanceId].sort(),
    );
    // The tail did not: a Digimon is on the battle area.
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("suna").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("a Digimon in BREEDING is not a Digimon you have (CR 3-4-5-8), so the tail still plays [Sunarizamon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          breeding: { card: "BT1-009", as: "bred" },
          hand: [
            { card: CARD_ID, as: "replacement" },
            { card: "BT1-013", as: "spare" },
          ],
          trash: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sunaId = s.inst("suna").instanceId;

    const loop = s.engine.startTurnLoop();
    // A breeding permanent parks the turn loop in the Breeding phase until the turn player
    // acts; passing it is the public way through to Main.
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("replacement").instanceId, sunaId].sort(),
    );
    expect(p0.trash.map(({ instanceId }) => instanceId)).not.toContain(sunaId);
    // The bred Digimon never moved.
    expect(p0.breeding?.topCard?.instanceId).toBe(s.perm("bred").topCard.instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("without a [Close] in hand nothing happens: the cost is not paid and the tail cannot run", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "source" }],
          hand: [{ card: "BT1-013", as: "spare" }],
          trash: [{ card: SUNARIZAMON, as: "suna" }],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => false, 60);

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([s.inst("source").instanceId]);
    expect(p0.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("suna").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [All Turns] memory gain, driven by a real effect-trash ---

  /**
   * Playing EX10-028 Landramon pays its [On Play] cost by trashing a [Mineral] card from one
   * of my Digimon's digivolution stacks — a genuine effect-trash through `playCard`.
   */
  const trashFixture = (host: string, closeZone: "battleArea" | "hand" | "trash") =>
    setupEngine(
      {
        0: {
          battleArea: [
            ...(closeZone === "battleArea" ? [{ card: CARD_ID, as: "close" }] : []),
            { card: host, as: "host", under: [{ card: INERT_MINERAL, as: "fuel" }] },
          ],
          hand: [
            { card: LANDRAMON, as: "landramon" },
            ...(closeZone === "hand" ? [{ card: CARD_ID, as: "close" }] : []),
          ],
          trash: closeZone === "trash" ? [{ card: CARD_ID, as: "close" }] : [],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

  it("suspends this Tamer and gains 1 memory when an effect trashes a [Mineral] Digimon's digivolution card", async () => {
    const s = trashFixture(INERT_MINERAL, "battleArea");
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);

    // 4 memory paid for Landramon, then +1 from this Tamer.
    expect(s.state.memory).toBe(1);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fuel").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire when the host Digimon has neither the [Mineral] nor the [Rock] trait", async () => {
    // BT1-019 DarkTyrannomon is [Dinosaur]: the trashed CARD is still [Mineral], so Landramon
    // can pay from that stack, but this Tamer's watcher is gated on the HOST's trait.
    const s = trashFixture("BT1-019", "battleArea");
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fuel").instanceId);
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is inert in the HAND: no memory is gained and the card never leaves the hand", async () => {
    const s = trashFixture(INERT_MINERAL, "hand");
    await s.ready();
    s.state.memory = 4;
    const closeId = s.inst("close").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([closeId]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain(CARD_ID);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("is inert in the TRASH: no memory is gained and the card never leaves the trash", async () => {
    const s = trashFixture(INERT_MINERAL, "trash");
    await s.ready();
    s.state.memory = 4;
    const closeId = s.inst("close").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(closeId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain(CARD_ID);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot gain memory when the Tamer is already suspended: the cost is unpayable", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "close", suspended: true },
            { card: INERT_MINERAL, as: "host", under: [{ card: INERT_MINERAL, as: "fuel" }] },
          ],
          hand: [{ card: LANDRAMON, as: "landramon" }],
          deck: INERT_DECK,
        },
        1: { deck: INERT_DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("landramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.length === 0 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    expect(s.state.memory).toBe(0);
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[All Turns]: the watcher is still armed during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "close" }],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-010"],
        },
        1: { deck: INERT_DECK, hand: ["BT1-013"], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const closePermanentId = s.perm("close").permanentId;
    expect(observe(s.engine).subscriptions("whenDigivolutionTrashed", closePermanentId).length).toBeGreaterThan(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    // "[All Turns]" — the subscription survives the turn change instead of being torn down
    // with the turn player's own-turn watchers.
    expect(observe(s.engine).subscriptions("whenDigivolutionTrashed", closePermanentId).length).toBeGreaterThan(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns] on the OPPONENT's turn: their BT15-019 trashes my [Mineral] Digimon's digivolution card", async () => {
    // The only public route that makes the NON-turn player's board produce an effect-trash of
    // MY digivolution cards: BT15-019 Crabmon's `[On Play] Trash the bottom digivolution card
    // of 1 of your opponent's Digimon`, played by seat 1 on seat 1's turn. ＜De-Digivolve＞ is
    // NOT such a route: `peelStackTops`
    // (apps/api/src/engine/effects/primitives.ts) trashes the current TOP card and fires
    // `whenDigimonTopTrashed`, never `whenDigivolutionTrashed` /
    // `onDigivolutionCardsDiscardedBatch` — those two are emitted only by
    // `trashDigivolutionCards` / `trashDigivolutionCardsAtomic` in the same file.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "close" },
            {
              card: INERT_MINERAL,
              as: "host",
              under: [
                { card: INERT_MINERAL, as: "bottomFuel" },
                { card: INERT_MINERAL, as: "topFuel" },
              ],
            },
          ],
          // No [Close] in hand, so seat 0's own start-of-main window is a no-op.
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          hand: [
            { card: OPPONENT_STACK_TRASHER, as: "crabmon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const closePermanentId = s.perm("close").permanentId;
    expect(observe(s.engine).subscriptions("whenDigivolutionTrashed", closePermanentId).length).toBeGreaterThan(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    // `state.memory` is TURN-relative (MemoryGauge.value): on seat 1's turn a positive value is
    // seat 1's memory. Seat 1 pays 3 for Crabmon, then seat 0's Tamer pulls 1 back.
    s.state.memory = 6;
    const handBefore = s.state.players[1]!.hand.length;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("close").isSuspended && s.state.pendingDecision === undefined);

    // The bottom digivolution card left my host's stack for MY trash.
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("topFuel").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("bottomFuel").instanceId);
    // The watcher fired on the opponent's turn: the Tamer suspended and 1 memory came back to
    // seat 0 (`gainMemoryForSeat(ctx.source.ownerSeat, …)`, not the turn player).
    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
    // My host still has a digivolution card, so Crabmon's own "then" draw did not run.
    expect(s.state.players[1]!.hand).toHaveLength(handBefore - 1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Peer: EX10-032 Proganomon reads this Tamer by name ---

  it("peer EX10-032: this Tamer is the [Close] that opens Proganomon's [Hand] [Main] route", async () => {
    const withClose = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-055", as: "suna" },
            { card: CARD_ID, as: "close" },
          ],
          hand: [{ card: PROGANOMON, as: "proganomon" }],
          trash: [{ card: LANDRAMON, as: "landramon" }],
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    withClose.state.memory = 3;
    await withClose.ready();

    const entries = JSON.parse(withClose.inst("proganomon").activatableEffectsJson || "[]") as {
      effectKey: string;
    }[];
    expect(entries).toHaveLength(1);
    expect(
      withClose.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: withClose.inst("proganomon").instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => withClose.perm("suna").topCard.cardId === PROGANOMON);

    expect(withClose.perm("suna").stack.map(({ instanceId }) => instanceId)).toEqual([
      withClose.inst("landramon").instanceId,
      withClose.inst("suna").instanceId,
    ]);
    // This Tamer is still on the board: Proganomon reads it, it does not consume it.
    expect(withClose.perm("close").topCard.cardId).toBe(CARD_ID);
    expect(withClose.state.pendingDecision).toBeUndefined();

    // Same board without this Tamer: the "If you have [Close]" gate closes the whole clause.
    const withoutClose = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-055", as: "suna" }],
          hand: [{ card: PROGANOMON, as: "proganomon" }],
          trash: [{ card: LANDRAMON, as: "landramon" }],
          deck: INERT_DECK,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    withoutClose.state.memory = 3;
    await withoutClose.ready();
    expect(JSON.parse(withoutClose.inst("proganomon").activatableEffectsJson || "[]")).toHaveLength(0);
  });

  // --- [Security] ---

  it("[Security] plays itself for free when a real attack checks it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }],
          deck: INERT_DECK,
        },
        1: {
          // No ＜Blocker＞ on the defending side, so the block window closes on its own.
          security: [{ card: CARD_ID, as: "sec" }],
          deck: INERT_DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const secId = s.inst("sec").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    const p1 = s.state.players[1]!;
    // The checked card was played by its OWNER, not trashed.
    expect(p1.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([secId]);
    expect(p1.trash.map(({ instanceId }) => instanceId)).not.toContain(secId);
    expect(p1.security).toHaveLength(0);
    // "without paying the cost": the play cost of 3 was never charged.
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
