import { digivolutionRequirementsFor, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-008.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX7-008 ToyAgumon", () => {
  it("compiles its alternate evolution, reveal/add effect, and inherited DP effect", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(digivolutionRequirementsFor("EX7-008")).toContainEqual({
      level: 2,
      texts: ["Three Musketeers"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [
              { count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Three Musketeers"], match: "text" }] } },
              { count: 1, to: "hand", filter: { kind: ["Option"], costComparison: { op: "eq", value: 6 } } },
            ],
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
      },
    ]);
  });

  it("plays publicly, adds one Three Musketeers-text card and one cost-6 Option, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-008", as: "toy" }],
          deck: ["EX7-071", "EX7-070", "BT1-009"],
          security: ["BT1-013"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX7-071") &&
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX7-070"),
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-008")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX7-071", "EX7-070"]),
    );
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("adds as many matching cards as possible and returns a nonmatching revealed card to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-008", as: "toy" }],
          deck: ["EX7-059", "EX7-070", "EX7-069"],
        },
        1: { deck: ["BT1-014"], security: ["BT1-014"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX7-070"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX7-059", "EX7-070"]),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain("EX7-069");
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["EX7-069"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("returns all three revealed near-misses to the deck bottom", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX7-008", as: "toy" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("toy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX7-008"));
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toEqual(expect.arrayContaining(["BT1-009"]));
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("legally alternate-digivolves from a level-2 Digi-Egg and preserves the source stack and bonus draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "base" }],
        hand: [{ card: "EX7-008", as: "toy" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const bonusDrawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-008");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === bonusDrawInstanceId)).toBe(true);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-001"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("rejects an illegal level-3 non-text source without moving, paying, or drawing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX7-008", as: "toy" }],
        deck: ["BT1-010"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const deckBefore = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckBefore);
    expect(s.perm("base").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("base").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("applies inherited +2000 DP only during the owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-008"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(3000);
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("is observable through the real turn loop after a legal evolution stack is established", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-001", as: "egg" }],
        hand: [{ card: "EX7-008", as: "toy" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { deck: ["BT1-014"], security: ["BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-001");
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("toy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX7-008");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
