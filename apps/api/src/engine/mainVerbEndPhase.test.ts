import { Phase, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/index.js";

describe("Main phase waits for accepted play continuations", () => {
  it("defers an accepted pass until Taiki's forced Rush attack finishes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-083", as: "taiki" }],
          hand: ["BT1-009"],
          deck: Array(20).fill("BT1-009"),
        },
        1: { security: ["BT1-009"], deck: Array(20).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.give(0, Zone.Hand, { card: "BT11-019", as: "shoutmon" });

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoutmon").instanceId })).toEqual({
      ok: true,
    });
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: false, reason: "not-your-turn" });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: false, reason: "not-your-turn" });
    expect(s.state.phase).toBe(Phase.Main);

    await turn;
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    assertNoLoudGap(s);
  });

  it("preserves the paid memory cost when a queued pass follows a play across the gauge", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-009", as: "played" }], deck: Array(20).fill("BT1-009") },
      1: { deck: Array(20).fill("BT1-009") },
    });
    s.state.memory = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.memory).toBe(-1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await turn;
    expect(s.state.memory).toBe(-1);
    assertNoLoudGap(s);
  });

  it("rejects a pass after surrender even if an accepted play is still settling", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT1-009", as: "played" }], deck: Array(20).fill("BT1-009") },
      1: { deck: Array(20).fill("BT1-009") },
    });
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "illegal-target" });

    await turn;
    assertNoLoudGap(s);
  });
});
