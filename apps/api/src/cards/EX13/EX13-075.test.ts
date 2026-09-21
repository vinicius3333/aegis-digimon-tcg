import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-075.js";
import { syntheticDefinitions } from "../../engine/testkit/syntheticDefinitions.js";
import "../index.js";

vi.hoisted(() => vi.resetModules());
vi.mock("@aegis/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aegis/shared")>();
  const { syntheticCardLookups, syntheticDefinitions: fixtures } =
    await import("../../engine/testkit/syntheticDefinitions.js");
  return { ...actual, ...syntheticCardLookups(actual, fixtures) };
});

afterEach(() => syntheticDefinitions.clear());

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
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.state.players[0]!.deck.every(({ faceUp }) => !faceUp)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

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

  it("Q7456 adds a card whose only [Huckmon] mention is in its inherited effect", async () => {
    const inheritedOnlyId = "TEST-EX13-075-INHERITED-HUCKMON";
    syntheticDefinitions.set(inheritedOnlyId, {
      ...getCardDefinition("BT1-009")!,
      cardId: inheritedOnlyId,
      nameEn: "Synthetic Neutral Rookie",
      effectText: undefined,
      inheritedEffectText: "[Your Turn] While you have [Huckmon], this Digimon gets +1000 DP.",
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "mon" }],
          deck: [
            { card: "BT1-009", as: "firstRest" },
            { card: inheritedOnlyId, as: "inheritedOnly" },
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

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("inheritedOnly").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
  });

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
