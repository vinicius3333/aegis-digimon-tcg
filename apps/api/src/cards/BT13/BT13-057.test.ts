import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-057.js";
import "./BT13-053.js";
import "./BT13-100.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";

describe("BT13-057 Rosemon", () => {
  it("models the optional processing condition and unsuspended opponent targets", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({
          kind: "Unsuspend",
          optional: true,
          abortOnDecline: true,
          cost: expect.objectContaining({
            kind: "suspend",
            target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }),
          }),
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
          actions: [
            expect.objectContaining({
              kind: "Suspend",
              target: expect.objectContaining({ filter: expect.objectContaining({ unsuspended: true }) }),
            }),
          ],
        }),
      ],
    });
  });

  it("loads the compiled Rosemon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-057", as: "rose" }] } });
    await s.ready();
    expect(s.perm("rose").topCard?.cardId).toBe("BT13-057");
  });

  it("accepts the optional digivolving condition, pays one legal target, and unsuspends this Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-053", as: "base", suspended: true }],
          hand: [{ card: "BT13-057", as: "rose" }],
          deck: [{ card: "BT1-010", as: "bonus" }],
        },
        1: {
          battleArea: [
            { card: "BT13-047", as: "opponent" },
            { card: "BT13-100", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rose").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.perm("base").isSuspended && (s.perm("opponent").isSuspended || s.perm("opponentTamer").isSuspended),
    );
    expect(s.perm("base").topCard?.cardId).toBe("BT13-057");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);
  });

  it("can decline the optional processing condition without changing Rosemon or either legal target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-053", as: "rose", suspended: true }],
          hand: [{ card: "BT13-057", as: "evolution" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT13-047", as: "opponent" },
            { card: "BT13-100", as: "opponentTamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rose").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rose").topCard.cardId === "BT13-057");
    await settle();
    expect(s.state.memory).toBe(7);
    expect(s.perm("rose").stack.map((card) => card.instanceId)).toEqual([s.inst("rose").instanceId]);
    expect(s.perm("rose").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
  });

  it("reacts to public opponent attacks once per turn and resets in the next opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-057", as: "rose" }],
          security: ["BT1-046", "BT1-046", "BT1-046", "BT1-046"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-010", as: "third" },
            { card: "BT1-010", as: "fourth" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && !observe(s.engine).isAttacking());
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("third").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("fourth").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("second").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });
});
