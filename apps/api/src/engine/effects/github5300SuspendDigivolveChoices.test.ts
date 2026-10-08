import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { drainMicrotasks, setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("GitHub #5300 same suspend-condition mechanism", () => {
  it("BT13-050 public Main activation can pay suspension, then decline a legal Fairy evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-050", as: "source" }],
          hand: [{ card: "BT13-054", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const effect = observe(s.engine).activatableEffects(s.perm("source"))[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").isSuspended);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    expect(s.perm("source").topCard.cardId).toBe("BT13-050");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("evolution").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("AD1-022 public play reaction can pay suspension, then decline a legal ADVENTURE evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-022", as: "source" },
            { card: "AD1-001", as: "base" },
          ],
          hand: [
            { card: "AD1-001", as: "trigger" },
            { card: "ST20-04", as: "evolution" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").isSuspended);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    expect(s.perm("base").topCard.cardId).toBe("AD1-001");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("evolution").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
