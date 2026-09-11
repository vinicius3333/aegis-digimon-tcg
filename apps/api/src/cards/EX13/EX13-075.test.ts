import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-075.js";
import "../index.js";

// Reveal fixtures, chosen so every axis of the single [Huckmon]-text slot is exercised:
//   BT6-009  Huckmon    — carries the token AS its name (the plain name-carrier).
//   BT6-011  BaoHuckmon — carries the token only as a SUBSTRING of its name; "in its text"
//                         reads printed information, so it qualifies. This is the same
//                         reading EX13-014/EX13-061 rely on for their "Lv.5 w/[Huckmon] in
//                         text" headers, whose only catalog answer is SaviorHuckmon.
//   BT6-093  Judgement of the Blade — an OPTION whose only [Huckmon] mention sits inside its
//                         printed effect text. It is neither named nor "treated as" a
//                         [Huckmon], so it is a genuine text-only fixture (not the
//                         `effectiveStaticNames` false-green trap) and it also proves the
//                         slot carries no card-kind restriction.
//   BT1-009/012/013/014 — inert Digimon with no [Huckmon] token anywhere.
const CARD_ID = "EX13-075";
const inertDeck = ["BT1-009", "BT1-012", "BT1-013", "BT1-014"];

describe("EX13-075 Mon", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Mon",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      evoCosts: [],
      effectText:
        "[Start of Your Turn] If you have 2 or less memory, set it to 3.\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Huckmon] in its text among them to the hand. Return the rest to the bottom of the deck.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(getCardDefinition(CARD_ID)?.inheritedEffectText ?? "").toBe("");
  });

  it("maps every printed clause onto IR", () => {
    expect(compiled.effects).toHaveLength(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();

    expect(compiled.effects[0]).toEqual({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(compiled.effects[1]).toEqual({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects[2]).toEqual({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — [Start of Your Turn] If you have 2 or less memory, set it to 3.
  // ---------------------------------------------------------------------------

  it("raises the memory floor to 3 through a real turn when below the threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mon" }], hand: [{ card: "BT1-009", as: "spare" }], deck: inertDeck },
      1: { deck: inertDeck },
    });
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("mon").instanceId,
    ]);
    // The floor is not an [On Play]: the reveal must stay silent, so the hand keeps only the
    // seeded spare plus the ordinary draw for the turn.
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("raises memory from exactly 2 (boundary, inclusive)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mon" }], hand: [{ card: "BT1-009", as: "spare" }], deck: inertDeck },
      1: { deck: inertDeck },
    });
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves memory alone at 3 or more — it sets, never adds", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mon" }], hand: [{ card: "BT1-009", as: "spare" }], deck: inertDeck },
      1: { deck: inertDeck },
    });
    s.state.memory = 7;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "mon" }], deck: inertDeck },
      1: { hand: [{ card: "BT1-009", as: "spare" }], deck: inertDeck },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    // Seat 1's turn: seat 0's [Start of Your Turn] must not fire, so the gauge is untouched.
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("fires again on the next own turn after a full turn cycle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "mon" }],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: inertDeck,
        security: ["BT1-012", "BT1-013"],
      },
      1: { hand: [{ card: "BT1-009", as: "opponentSpare" }], deck: inertDeck, security: ["BT1-012", "BT1-013"] },
    });
    s.state.memory = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 2;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [On Play] reveal 3, add 1 [Huckmon]-text card, bottom the rest
  // ---------------------------------------------------------------------------

  it("reveals exactly 3, adds the [Huckmon]-named card and bottoms the other two in order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT6-009", as: "huckmon" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-012", as: "secondRest" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("huckmon").instanceId]);
    // Exactly 3 cards left the top: the 4th was never touched and is still on top, with the
    // two non-matching reveals underneath it at the bottom.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.state.players[0]!.deck.every(({ faceUp }) => !faceUp)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // Played from hand at the printed cost of 4.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // §4-23-1/§4-23-3: "in its text" is the token anywhere in the card's printed information,
  // so an Option that names [Huckmon] only inside an effect it can never trigger from the
  // deck still qualifies. `match: "name"` would leave it behind, and the printed slot says
  // "1 card", not "1 Digimon card", so a non-Digimon is legal here.
  it("adds an Option whose only [Huckmon] mention sits inside its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT1-009", as: "firstRest" },
            { card: "BT6-093", as: "textOnly" },
            { card: "BT1-012", as: "secondRest" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("textOnly").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  // The token also counts as part of a longer printed name — the reading EX13-014/EX13-061
  // depend on for "Lv.5 w/[Huckmon] in text", whose only catalog answers are SaviorHuckmon
  // and BaoHuckmon. A `nameExact` encoding would wrongly refuse this.
  it("accepts a card carrying the token inside a longer name (BaoHuckmon)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-012", as: "secondRest" },
            { card: "BT6-011", as: "baoHuckmon" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle();

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("baoHuckmon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
  });

  // The slot discriminates rather than merely firing: a name-carrier, a text-only carrier and
  // a non-carrier are revealed together, exactly ONE card leaves (the printed "Add 1 card"),
  // and the two it passed over go to the bottom.
  it("adds exactly one card when several revealed cards carry the token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT6-009", as: "huckmon" },
            { card: "BT6-093", as: "textOnly" },
            { card: "BT1-009", as: "nonMatch" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await settle();

    const hand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(hand).toHaveLength(1);
    expect(hand[0]).toBe(s.inst("huckmon").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("textOnly").instanceId,
      s.inst("nonMatch").instanceId,
    ]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("returns all three revealed cards to the bottom when none carries the token", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-012", as: "second" },
            { card: "BT1-013", as: "third" },
            { card: "BT1-014", as: "unrevealed" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — [Security] Play this card without paying the cost.
  // ---------------------------------------------------------------------------

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-012", as: "second" },
            { card: "BT1-013", as: "third" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("mon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("mon").instanceId),
    );
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("mon").instanceId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(s.inst("mon").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("mon").instanceId);
    // Free: the 4 memory the printed play cost would have charged was never spent.
    expect(s.state.memory).toBe(5);
  });

  it("plays itself from security during a real attack and still runs its [On Play] reveal", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: CARD_ID, as: "mon" },
            { card: "BT1-011", as: "remainingSecurity" },
          ],
          deck: [
            { card: "BT6-009", as: "huckmon" },
            { card: "BT1-009", as: "firstRest" },
            { card: "BT1-012", as: "secondRest" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: inertDeck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    const monId = s.inst("mon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([monId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(monId);
    // The security play is a real play, so [On Play] resolved off the top of the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("huckmon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
