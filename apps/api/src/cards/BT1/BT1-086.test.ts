import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-086.js";

describe("BT1-086 Matt Ishida", () => {
  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-086", as: "matt" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matt").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }] } });
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));
    expect(s.state.memory).toBe(3);
  });

  it("sets memory from exactly 2 to 3, but does not lower memory already at 3", async () => {
    const atTwo = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }] } });
    atTwo.state.memory = 2;
    await advance(atTwo.engine).fire(EffectTiming.OnStartTurn, atTwo.perm("matt"));
    expect(atTwo.state.memory).toBe(3);

    const atThree = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }] } });
    atThree.state.memory = 3;
    await advance(atThree.engine).fire(EffectTiming.OnStartTurn, atThree.perm("matt"));
    expect(atThree.state.memory).toBe(3);
  });

  it("sets memory while Matt Ishida is suspended (Q949)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt", suspended: true }] } });
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));

    expect(s.state.memory).toBe(3);
    expect(s.perm("matt").isSuspended).toBe(true);
  });

  it("does not set memory during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-086", as: "matt" }] } });
    s.state.turnSeat = 1;
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("matt"));

    expect(s.state.memory).toBe(1);
  });

  it("may suspend itself when a blue Digimon is played to trash an opponent's bottom source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-086", as: "matt" }], hand: [{ card: "BT1-027", as: "blue" }] },
        1: { battleArea: [{ card: "BT1-072", as: "target", under: [{ card: "BT1-066", as: "bottom" }, "BT1-067"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("matt").isSuspended &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId),
    );
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("may decline suspending Matt, leaving the opposing source intact", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-086", as: "matt" }], hand: [{ card: "BT1-027", as: "blue" }] },
        1: { battleArea: [{ card: "BT1-072", as: "target", under: [{ card: "BT1-066", as: "bottom" }] }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "confirm");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("matt").isSuspended).toBe(false);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("does not trigger when a non-blue Digimon is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-086", as: "matt" }], hand: [{ card: "BT1-010", as: "red" }] },
        1: { battleArea: [{ card: "BT1-072", as: "target", under: [{ card: "BT1-066", as: "bottom" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("red").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("red").instanceId),
    );

    expect(s.perm("matt").isSuspended).toBe(false);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("does not trigger when Matt is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-086", as: "matt", suspended: true }],
          hand: [{ card: "BT1-027", as: "blue" }],
        },
        1: { battleArea: [{ card: "BT1-072", as: "target", under: [{ card: "BT1-066", as: "bottom" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blue").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("blue").instanceId),
    );

    expect(s.perm("target").stack.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-086", as: "securityMatt", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityMatt"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityMatt").instanceId,
      ),
    ).toBe(true);
  });
});
