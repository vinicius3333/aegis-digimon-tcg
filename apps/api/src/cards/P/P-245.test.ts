import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("draws only once per turn even when the end-of-turn window fires twice", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-060", as: "host", under: ["P-245"] },
            { card: "BT5-061", as: "first" },
            { card: "ST5-03", as: "second" },
          ],
          deck: [{ card: "BT3-059", as: "drawn" }, { card: "BT3-059", as: "undrawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();
    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("undrawn").instanceId)).toBe(true);
  });

  it("keeps the inherited clause after a real breeding digivolution onto the egg", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "P-245", as: "egg" },
          hand: [{ card: "BT3-060", as: "evolving" }],
          battleArea: [{ card: "BT5-061", as: "blocker" }],
          deck: [{ card: "BT3-059", as: "drawn" }, "BT3-059"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "BT3-060");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["P-245"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("egg").inBreeding);
    s.state.phase = Phase.Main;

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("blocker").isSuspended).toBe(true);
  });
});
