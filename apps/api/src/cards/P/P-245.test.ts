import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./P-245.js";

/**
 * P-245 Kakkinmon — DigiEgg, Lv.2 In-Training, Black, [Armor].
 *
 * [Inherited][End of All Turns][Once Per Turn] By suspending 1 of your black Digimon with
 * ＜Blocker＞, if your hand has 7 or fewer cards, ＜Draw 1＞
 *
 * Fixtures are deliberately inert: BT3-060 Psychemon (black Lv.3, no printed or inherited
 * text) hosts the egg, BT5-061 Commandramon is a printed-＜Blocker＞ black Lv.3 with no
 * inherited text, BT3-059 Commandramon is a black Lv.3 WITHOUT ＜Blocker＞, and BT13-082
 * Peckmon is a ＜Blocker＞ that is PURPLE — the two decoys prove both halves of the cost
 * filter.
 */
describe("P-245 Kakkinmon", () => {
  it("matches the immutable catalog identity and keeps full IR coverage", () => {
    expect(getCardDefinition("P-245")).toMatchObject({
      nameEn: "Kakkinmon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Armor"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("encodes the inherited once-per-turn end-of-all-turns draw behind the suspend cost", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "EndOfAllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Draw",
            controller: "mine",
            amount: 1,
            optional: true,
            abortOnDecline: true,
            condition: expect.objectContaining({ kind: "handAtMost", value: 7 }),
            cost: expect.objectContaining({
              kind: "suspend",
              target: expect.objectContaining({
                count: 1,
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Black"],
                  keywords: ["Blocker"],
                },
              }),
            }),
          }),
        ],
      }),
    ]);
  });

  it("suspends a black ＜Blocker＞ and draws at the end of its controller's real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker" },
          ],
          deck: [{ card: "BT3-059", as: "drawn" }, "BT3-059", "BT3-059"],
        },
        1: { deck: ["BT3-059", "BT3-059"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("also fires at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker" },
          ],
          deck: [{ card: "BT3-059", as: "drawn" }, "BT3-059"],
        },
        1: { deck: ["BT3-059", "BT3-059", "BT3-059"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).runTurn(1);
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("uses one exact egg source through own, opponent, and next-own end windows", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: [{ card: "P-245", as: "source" }] },
            { card: "BT5-061", as: "blocker" },
          ],
          hand: [{ card: "BT3-059", as: "playableFirst" }, "BT3-059", "BT3-059", "BT3-059", "BT3-059"],
          deck: [
            { card: "BT3-059", as: "drawnOwn" },
            { card: "BT3-059", as: "drawnOpponent" },
            { card: "BT3-059", as: "naturalNextOwn" },
            { card: "BT3-059", as: "drawnNextOwn" },
            ...Array.from({ length: 16 }, () => "BT3-059"),
          ],
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: {
          hand: [{ card: "BT3-059", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const loop = s.engine.startTurnLoop();
    const assertSourceAndWindow = (): void => {
      expect(s.perm("host").permanentId).toBe(hostId);
      expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    };

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnOwn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
    assertSourceAndWindow();

    await advance(s.engine).verb.unsuspend([s.perm("blocker").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    let secondWindowPaid = false;
    await settle(() => {
      if (
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnOpponent").instanceId) &&
        s.perm("blocker").isSuspended
      ) {
        secondWindowPaid = true;
      }
      return secondWindowPaid;
    });
    expect(secondWindowPaid).toBe(true);
    assertSourceAndWindow();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnOpponent").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("naturalNextOwn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(false);
    assertSourceAndWindow();

    expect(observe(s.engine).hasAnyMainPhaseAction(0)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playableFirst").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("playableFirst").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.hand).toHaveLength(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnNextOwn").instanceId) &&
        s.perm("blocker").isSuspended,
    );
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnNextOwn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
    assertSourceAndWindow();

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("pays only with a black ＜Blocker＞, leaving a black non-blocker and a purple blocker alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT3-059", as: "blackNoBlocker" },
            { card: "BT13-082", as: "purpleBlocker" },
            { card: "BT5-061", as: "blackBlocker" },
          ],
          deck: [{ card: "BT3-059", as: "drawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.perm("blackBlocker").isSuspended).toBe(true);
    expect(s.perm("blackNoBlocker").isSuspended).toBe(false);
    expect(s.perm("purpleBlocker").isSuspended).toBe(false);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does nothing when no black ＜Blocker＞ can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT3-059", as: "blackNoBlocker" },
            { card: "BT13-082", as: "purpleBlocker" },
          ],
          deck: [{ card: "BT3-059", as: "undrawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("undrawn").instanceId)).toBe(true);
    expect(s.perm("blackNoBlocker").isSuspended).toBe(false);
    expect(s.perm("purpleBlocker").isSuspended).toBe(false);
  });

  it("cannot pay with an already-suspended black ＜Blocker＞", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker", suspended: true },
          ],
          deck: [{ card: "BT3-059", as: "undrawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("undrawn").instanceId)).toBe(true);
  });

  it("draws at exactly seven cards in hand and declines the whole process at eight", async () => {
    const sevenCardHand = Array.from({ length: 7 }, () => "BT3-059");
    const atBoundary = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker" },
          ],
          hand: sevenCardHand,
          deck: [{ card: "BT3-059", as: "drawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    atBoundary.state.turnSeat = 0;
    await atBoundary.ready();

    await advance(atBoundary.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(atBoundary.state.players[0]!.hand).toHaveLength(8);
    expect(
      atBoundary.state.players[0]!.hand.some((card) => card.instanceId === atBoundary.inst("drawn").instanceId),
    ).toBe(true);
    expect(atBoundary.perm("blocker").isSuspended).toBe(true);

    const overBoundary = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker" },
          ],
          hand: [...sevenCardHand, "BT3-059"],
          deck: [{ card: "BT3-059", as: "undrawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    overBoundary.state.turnSeat = 0;
    await overBoundary.ready();

    await advance(overBoundary.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(overBoundary.state.players[0]!.hand).toHaveLength(8);
    expect(
      overBoundary.state.players[0]!.deck.some((card) => card.instanceId === overBoundary.inst("undrawn").instanceId),
    ).toBe(true);
    expect(overBoundary.perm("blocker").isSuspended).toBe(false);
  });

  it("declines the optional cost without suspending or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "blocker" },
          ],
          deck: [{ card: "BT3-059", as: "undrawn" }, "BT3-059"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("undrawn").instanceId)).toBe(true);
  });

  it("keeps the inherited clause inactive in breeding, then fires after a public move", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "P-245", as: "egg" }],
          hand: [{ card: "BT5-061", as: "evolving" }, "BT3-059", "BT3-059", "BT3-059", "BT3-059", "BT3-059"],
          battleArea: [{ card: "BT5-061", as: "blocker" }],
          deck: [
            { card: "BT3-059", as: "evolutionDraw" },
            { card: "BT3-059", as: "naturalNextOwn" },
            { card: "BT3-059", as: "inheritedDraw" },
            "BT3-059",
          ],
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
        1: {
          hand: [{ card: "BT3-059", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT3-059"),
          security: Array.from({ length: 5 }, () => "BT3-059"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "P-245");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT5-061");
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("evolving").instanceId);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("naturalNextOwn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("inheritedDraw").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.perm("blocker").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("naturalNextOwn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("inheritedDraw").instanceId)).toBe(true);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === eggPermanentId));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.perm("egg").topCard?.cardId).toBe("BT5-061");
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("inheritedDraw").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("naturalNextOwn").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("inheritedDraw").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.perm("egg").permanentId).toBe(eggPermanentId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toContain(eggInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
