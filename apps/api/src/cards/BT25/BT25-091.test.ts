import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-091 Monica Simmons", () => {
  it("sets the owner's memory to 3 only when it is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT25-091", as: "monica" }] } });
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("monica"));
    expect(s.state.memory).toBe(3);
    s.state.memory = 4;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("monica"));
    expect(s.state.memory).toBe(4);
  });

  it("returns one TS Option on play and does not draw when the return succeeds", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-091", as: "monica" }],
          trash: [{ card: "BT25-094", as: "tsOption" }],
          deck: [{ card: "BT25-001", as: "deckTop" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monica").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tsOption").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tsOption").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("deckTop").instanceId);
  });

  it("draws when the optional return is declined (Q6430-Q6431)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-091", as: "monica" }],
          trash: [{ card: "BT25-094", as: "tsOption" }],
          deck: [{ card: "BT25-001", as: "deckTop" }],
        },
      },
      { autoSelectCards: false },
    );
    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("monica"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await resolving;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tsOption").instanceId);
  });

  it("reacts after a real TS Option finishes routing, then suspends and restricts (Q6432)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-094", as: "tsOption" }], battleArea: [{ card: "BT25-091", as: "monica" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tsOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("target"), "attack"));
    expect(s.perm("monica").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("tsOption").instanceId)).toBe(true);
  });

  it("does not react when Security merely activates an Option effect (Q6433)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-091", as: "monica" }], security: [{ card: "BT25-094", as: "tsOption" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("tsOption"));
    expect(s.perm("monica").isSuspended).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(false);
  });

  it("does not react when a non-TS Option is used", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-038", as: "nonTsOption" }], battleArea: [{ card: "BT25-091", as: "monica" }] },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonTsOption").instanceId, useAs: "option" } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nonTsOption").instanceId));
    expect(s.perm("monica").isSuspended).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("target"), "attack")).toBe(false);
  });

  it("plays itself for free from Security", async () => {
    // Security cards are in trash by the time their Security effect resolves.
    const s = setupEngine({ 0: { trash: [{ card: "BT25-091", as: "monica" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("monica"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("monica").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
