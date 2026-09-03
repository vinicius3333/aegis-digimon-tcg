import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-051.js";

describe("EX2-051 ADR-07 Palates Head", () => {
  it("may suspend itself to delete an opposing Digimon with no more DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-051", as: "palates" }, "EX2-007"] },
        1: { battleArea: [{ card: "EX2-019", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("palates")) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("palates").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("palates").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not pay the activation cost when no opposing Digimon is in range", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-051", as: "palates" }, "EX2-007"] },
        1: { battleArea: [{ card: "EX2-022", as: "tooLarge" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("palates")) as Array<{ effectKey: string }>;
    expect(effects).toHaveLength(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("palates").topCard.instanceId,
        effectKey: "EX2-051/ir-27-0",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("palates").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("leaves itself and the target unchanged when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-051", as: "palates" }, "EX2-007"] },
        1: { battleArea: [{ card: "EX2-019", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const effects = observe(s.engine).activatableEffects(s.perm("palates")) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("palates").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("palates").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
