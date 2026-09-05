import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-038", () => {
  it("allows a security effect to unsuspend the target during the same public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-038", as: "source" }], hand: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-095"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([["BT1-090", false]]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-095"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("blocks only the next opponent unsuspend phase and expires before their Main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-038", as: "source" }, "BT1-090"], deck: ["BT1-090", "BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], deck: ["BT1-090", "BT1-090"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    s.state.turnCount = 2;
    s.state.isFirstPlayersFirstTurn = false;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("activates Training publicly, suspending and placing the deck top below existing sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-038", as: "host", under: ["EX9-035"] }], deck: ["BT1-090", "BT1-048"] },
    });
    await s.ready();
    const host = s.perm("host");
    const training = observe(s.engine)
      .activatableEffects(host)
      .find(({ instanceId }) => instanceId === host.topCard.instanceId);
    expect(training).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: host.topCard.instanceId,
        effectKey: training!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(host.isSuspended).toBe(true);
    expect(host.stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-090", false],
      ["EX9-035", true],
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-007", "EX9-035", "BT1-009", "EX9-037"])(
    "checks the DM level-3 alternate route from %s and draws on legal evolution",
    async (base) => {
      const valid = base === "EX9-007" || base === "EX9-035";
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-038", as: "evo" }], deck: ["BT1-090"] },
      });
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(valid);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(valid ? "EX9-038" : base);
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(valid ? [base] : []);
      expect(s.state.memory).toBe(valid ? 3 : 5);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(valid ? ["BT1-090"] : ["EX9-038"]);
      expect(s.state.players[0]!.deck).toHaveLength(valid ? 0 : 1);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("has Training and suspends an opposing Digimon with an unsuspend restriction on play and attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    for (const trigger of ["OnPlay", "WhenAttacking"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ConditionalBranch",
            optional: true,
            abortOnDecline: true,
            cost: { kind: "place", target: { filter: { zone: "hand" } } },
            ifTrue: [
              { kind: "Suspend" },
              {
                kind: "Restrict",
                restriction: "unsuspendDuringOwnUnsuspendPhase",
                duration: "untilOpponentNextUnsuspendPhase",
                target: { sameTarget: true },
              },
            ],
          },
        ],
      });
  });
  it("inherits Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Piercing",
      raw: "＜Piercing＞",
    }));

  it("places a hand card face-down and restricts the selected target on a public attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-038", as: "source", under: ["EX9-007"] }], hand: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-048"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-090", false],
      ["EX9-007", true],
    ]);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not activate On Play without an accepted hand-card payment", async () => {
    for (const hasPayment of [true, false]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "EX9-038", as: "source" }, ...(hasPayment ? [{ card: "BT1-090" }] : [])],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle();

      expect(s.perm("source").stack).toHaveLength(0);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(hasPayment ? ["BT1-090"] : []);
      expect(s.state.memory).toBe(6);
      expect(s.state.pendingDecision).toBeUndefined();
    }
  });

  it.each([true, false])(
    "finishes the attack without suspension when payment is declined or unavailable (hand=%s)",
    async (hasPayment) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-038", as: "source" }], hand: hasPayment ? ["BT1-090"] : [] },
          1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-048"] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("source").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("source").stack).toHaveLength(0);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(hasPayment ? ["BT1-090"] : []);
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("resolves the On Play body through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-038", as: "source" },
            { card: "BT1-090", as: "payment" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "BT1-090", faceUp: false },
    ]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still restricts the selected Digimon when it was already suspended (Q4792)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-038", as: "source" }], hand: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }], security: ["BT1-048"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits Piercing through a legal stack and performs the security check after battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-007", as: "attacker" }],
        hand: [
          { card: "EX9-038", as: "champion" },
          { card: "BT1-076", as: "ultimate" },
        ],
        deck: ["BT1-090", "BT1-048"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000, suspended: true }], security: ["BT1-048"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("champion").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").topCard.cardId).toBe("EX9-038");
    expect(s.perm("attacker").stack.map(({ cardId }) => cardId)).toEqual(["EX9-007"]);
    expect(s.state.memory).toBe(6);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("attacker").permanentId,
        instanceId: s.inst("ultimate").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("attacker").topCard.cardId).toBe("BT1-076");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090", "BT1-048"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("attacker").stack.map(({ cardId }) => cardId)).toEqual(["EX9-007", "EX9-038"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-048"]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
