import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-023.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-023", () => {
  it("reveals 3 for a DM and Ver.3 card, placing the latter under a DM Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } },
        {
          count: 1,
          to: "placeUnder",
          faceDown: true,
          filter: { nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
          underFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["DM"], match: "trait" }] },
        },
      ],
      rest: "deckBottom",
    }));
  it("has the alternate zero-cost DM level 2 digivolution requirement", () =>
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["DM"], cost: 0, isAlternate: true }]));
  it("inherits Barrier", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Barrier",
      raw: "＜Barrier＞",
    }));

  it("plays publicly, adds a revealed DM card, places a Ver.3 card face down, and bottoms the rest", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-023", as: "source" }],
          battleArea: [{ card: "EX9-022", as: "host" }],
          deck: ["EX9-022", "EX9-023", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("host").topCard!.instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-022")).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "EX9-023" && !card.faceUp)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("follows Q4774 by adding the sole DM/Ver.3 overlap before placement", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-023", as: "source" }],
          battleArea: [{ card: "EX9-022", as: "host" }],
          deck: ["EX9-023", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX9-023")).toHaveLength(1);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not place a card when none of the revealed cards has Ver.3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-023", as: "source" }],
          battleArea: [{ card: "EX9-022", as: "host" }],
          deck: ["EX9-022", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX9-022");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("pays inherited Barrier only when accepted after a legal evolution: %s", async (accept) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-023", as: "host" }],
        hand: [{ card: "BT1-051", as: "evo" }],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "ST1-10", as: "attacker" }] },
    });
    s.state.memory = 10;
    await s.ready();
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(host.topCard.cardId).toBe("BT1-051");
    expect(host.stack.map(({ cardId }) => cardId)).toEqual(["EX9-023"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(8);
    host.isSuspended = true;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: host.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.events.some(({ kind }) => kind === "barrierPrompt")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: host.permanentId, accept })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(accept);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(accept ? [] : ["BT1-009"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId).sort()).toEqual(
      accept ? ["BT1-009"] : ["EX9-023", "BT1-051"].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
