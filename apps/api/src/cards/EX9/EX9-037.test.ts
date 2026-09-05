import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-037.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-037", () => {
  it("activates Training publicly and puts the unrevealed top card below existing sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-037", as: "host", under: ["EX9-035"] }],
        deck: ["BT1-090", "BT1-048"],
      },
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
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("does not suspend without paying the On Play cost (eligible hand=%s)", async (hasPayment) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-037", as: "source" }, ...(hasPayment ? [{ card: "BT1-090" }] : [])] },
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
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(hasPayment ? ["BT1-090"] : []);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-007", "BT1-009"])("checks the off-color DM evolution requirement on %s", async (base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "host" }],
          hand: [{ card: "EX9-037", as: "evo" }],
          deck: ["BT1-048"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("evo").instanceId,
      useAlternateCost: true,
    });
    expect(result.ok).toBe(base === "EX9-007");
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(base === "EX9-007" ? "EX9-037" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(base === "EX9-007" ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(
      base === "EX9-007" ? ["BT1-048"] : ["EX9-037"],
    );
    expect(s.state.memory).toBe(base === "EX9-007" ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("suspends an opposing Digimon and prevents that same target from unsuspending in their next unsuspend phase", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
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
  it("inherits once-per-turn suspension when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }],
    }));

  it("places any hand card face-down but does not prevent effect-driven unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: false }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false]);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still restricts an already-suspended target when the suspend step cannot change it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-090"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("retains a restriction granted after the opponent's unsuspend phase until their next one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-090"], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const currentTurn = s.engine.runOneTurn();
    await settle();
    await advance(s.engine).waitForMainPhase(1);
    // Open the On Play window after this turn's unsuspend procedure has finished.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    advance(s.engine).endMainPhaseIfOpen(1);
    await currentTurn;
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the On Play body through a public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX9-037", as: "source" },
            { card: "BT1-090", as: "payment" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([["BT1-090", false]]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the When Digivolving body through a public digivolve intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "base" }],
          hand: [
            { card: "EX9-037", as: "source" },
            { card: "BT1-090", as: "payment" },
          ],
          deck: ["BT1-048"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.perm("base").topCard.cardId).toBe("EX9-037");
    expect(s.perm("base").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["BT1-090", false],
      ["EX9-035", true],
    ]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the inherited When Attacking suspension only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-076", as: "source", under: ["EX9-037"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-064", as: "second" },
          ],
          security: ["BT1-048", "BT1-046"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
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
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("source").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
