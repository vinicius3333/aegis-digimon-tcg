import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-102.js";
import "../BT6/BT6-002.js";
import "../BT7/BT7-087.js";
import "../EX2/EX2-007.js";

const TOKEN = "TOKEN-Amon-of-Crimson-Flame";

async function playAquaViperReturning(ownCardId: string) {
  const preferInstanceIds: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT4-023", as: "handWatcher", under: ["BT7-087"] },
          { card: ownCardId, as: "returned" },
        ],
        eggDeck: [{ card: "BT4-001", as: "eggDeckCard" }],
        hand: [{ card: "BT4-102", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT4-009", as: "levelFour" },
          { card: "BT4-045", as: "levelFive" },
        ],
      },
    },
    { autoSelectCards: true, preferInstanceIds },
  );
  const returnedInstanceId = s.perm("returned").topCard.instanceId;
  preferInstanceIds.push(returnedInstanceId);
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT4-009"));
  return { s, returnedInstanceId };
}

describe("BT4-102 Aqua Viper", () => {
  it("returns one own and up to two opposing level 4 stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-023", as: "mine", under: [{ card: "BT4-022", as: "mineSource" }] }],
          hand: [{ card: "BT4-102", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT4-009", as: "first", under: [{ card: "BT4-001", as: "firstSource" }] },
            { card: "BT4-026", as: "second", under: [{ card: "BT4-022", as: "secondSource" }] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT4-023")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mineSource").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstSource").instanceId, s.inst("secondSource").instanceId]),
    );
  });

  it("adds itself to its owner's hand from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT4-102", as: "securityOption", faceUp: true }] } });
    const id = s.inst("securityOption").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(true);
  });

  it("does not fire source-trash inherited effects during return teardown (Q1399)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-023", as: "mine" },
            { card: "BT6-025", as: "watcher", under: ["BT6-002"] },
          ],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
          hand: [{ card: "BT4-102", as: "option" }],
        },
        1: {
          battleArea: [{ card: "BT4-009", as: "target", under: [{ card: "BT4-001", as: "source" }] }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("watcher"));
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("notDrawn").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
  });
});

describe("BT4-102 Aqua Viper — KB Q&A rulings", () => {
  it("returning own Mother D-Reaper pays the return, sends it to the Digi-Egg deck bottom, and adds nothing to hand (Q1265)", async () => {
    const { s, returnedInstanceId } = await playAquaViperReturning("EX2-007");
    const own = s.state.players[0]!;
    expect(own.battleArea.some((permanent) => permanent.topCard.instanceId === returnedInstanceId)).toBe(false);
    expect(own.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("eggDeckCard").instanceId, returnedInstanceId]);
    expect(own.hand.some((card) => card.instanceId === returnedInstanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT4-045"]);
    expect(s.state.memory).toBe(2);

    const control = await playAquaViperReturning("BT4-022");
    expect(control.s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(control.returnedInstanceId);
    expect(control.s.state.memory).toBe(3);
  });

  it("returning own token pays the return, removes the token from the game, and adds nothing to hand (Q1266)", async () => {
    const { s, returnedInstanceId } = await playAquaViperReturning(TOKEN);
    const own = s.state.players[0]!;
    const everyOwnCard = [...own.hand, ...own.deck, ...own.trash, ...own.security, ...own.eggDeck];
    expect(own.battleArea.some((permanent) => permanent.topCard.instanceId === returnedInstanceId)).toBe(false);
    expect(everyOwnCard.some((card) => card.instanceId === returnedInstanceId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT4-009"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT4-045"]);
    expect(s.state.memory).toBe(2);
  });
});
