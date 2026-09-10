import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

describe("Q3528 inherited Once Per Turn identity", () => {
  it("keeps the activation record on the host through stack rotation and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-007", "EX5-007"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceA = s.perm("host").stack[0]!;
    const sourceB = s.perm("host").stack[1]!;
    const originalTop = s.perm("host").topCard!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const firstEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(firstEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: firstEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7 && s.perm("host").topCard?.instanceId === sourceB.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([originalTop.instanceId, sourceA.instanceId]);

    // The other physical copy gets its own first use. Q3528 only preserves
    // sourceB's spent record when sourceB leaves the inherited position.
    const secondCopyEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceA.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(secondCopyEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceA.instanceId,
        effectKey: secondCopyEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 9 && s.perm("host").topCard?.instanceId === sourceA.instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceB.instanceId, originalTop.instanceId]);

    // Cycling back to sourceB in the same turn is blocked: both physical
    // copies have now spent their own Once Per Turn use.
    expect(
      observe(s.engine)
        .activatableEffects(s.perm("host"))
        .filter((entry) => /Gain 2 memory/i.test(entry.description ?? "")),
    ).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const secondEffect = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => entry.instanceId === sourceB.instanceId && /Gain 2 memory/i.test(entry.description ?? ""));
    expect(secondEffect).toBeDefined();
    const beforeSecond = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceB.instanceId,
        effectKey: secondEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === beforeSecond + 2 && s.perm("host").topCard?.instanceId === originalTop.instanceId,
    );
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceA.instanceId, sourceB.instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
