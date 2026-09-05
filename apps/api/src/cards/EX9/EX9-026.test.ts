import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-026.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-026", () => {
  it.each([
    { base: "BT1-048", alternate: false, legal: true },
    { base: "BT1-009", alternate: true, legal: false },
  ])("checks the evolution route from $base", async ({ base, alternate, legal }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host" }],
          hand: [{ card: "EX9-026", as: "evo" }],
          deck: ["BT1-046"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(legal ? "EX9-026" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(legal ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(legal ? ["BT1-046"] : ["EX9-026"]);
    expect(s.state.memory).toBe(legal ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("has Training and its play/digivolve effects give an opposing Digimon -3000 DP for the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -3000,
            duration: "untilOpponentTurnEnd",
            alsoGainKeywords: [{ keyword: "SecurityAttack", amount: -1 }],
            cost: { kind: "place", faceDown: true, destination: "digivolutionStack" },
          },
        ],
      });
    }
  });
  it("adds the top deck card to security on deletion at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "SecurityManipulation", op: "addTop", amount: 1, condition: { kind: "zoneCount", value: 3 } }],
    });
  });
  it("inherits the same security recovery effect", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(
      expect.objectContaining({ kind: "SecurityManipulation", op: "addTop" }),
    ));

  it("places a hand card face down on play before reducing one opposing Digimon and its security attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX9-026", as: "source" }, "BT1-090"],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 5000 },
            { card: "BT1-010", as: "other", dp: 5000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]!.faceUp).toBe(false);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("fires the same effect after a public digivolution, paying its hand card underneath and expiring after the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-008", as: "host" }],
          hand: [{ card: "EX9-026", as: "evo" }, "BT1-090"],
          deck: ["BT1-048"],
          security: ["BT1-048"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 5000 },
            { card: "BT1-010", as: "other", dp: 5000 },
          ],
          deck: ["BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("host").topCard.cardId).toBe("EX9-026");
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-090", false],
      ["EX9-008", true],
    ]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.memory).toBe(8);
    expect(s.perm("target").currentDP).toBe(2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
    expect(s.perm("other").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.perm("target").currentDP).toBe(2000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("activates Training through its public effect intent and places the deck card face down at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-026", as: "source", under: ["EX9-008"] }],
          deck: ["BT1-090", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const source = s.perm("source");
    const sourceInstanceId = source.topCard.instanceId;
    const training = observe(s.engine)
      .activatableEffects(source)
      .find(({ instanceId }) => instanceId === sourceInstanceId);
    expect(training).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: training!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(source.isSuspended).toBe(true);
    expect(source.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-090", false],
      ["EX9-008", true],
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("preserves a payable hand card when the optional On Play cost is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-026", as: "source" }, "BT1-090"], security: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 5000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(5);
  });

  it("recovers the top deck card only at three or fewer security", async () => {
    const atMostThree = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-026"] }],
          deck: ["BT1-090"],
          security: ["BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(atMostThree.engine).verb.deletePermanent([atMostThree.perm("host").permanentId]);
    expect(atMostThree.state.players[0]!.security).toHaveLength(4);
    expect(atMostThree.state.players[0]!.deck).toHaveLength(0);

    const four = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "host", under: ["EX9-026"] }],
          deck: ["BT1-090"],
          security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        },
      },
      { autoOrderTriggers: true },
    );
    await advance(four.engine).verb.deletePermanent([four.perm("host").permanentId]);
    expect(four.state.players[0]!.security).toHaveLength(4);
    expect(four.state.players[0]!.deck).toHaveLength(1);
  });
});
