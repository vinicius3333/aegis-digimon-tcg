import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { armedSubTriggers, runSubTriggersInChosenOrder } from "./gameEngine/subTriggers.js";

describe("presets for repeated activations of one physical card", () => {
  it("preserves occurrence answers through the watcher-only resolution path", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST16-14", as: "matt" }] } },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: false,
      },
    );
    await s.ready();
    // Three separate discard actions, NOT three cards discarded simultaneously.
    // This bus seam verifies independent answers for genuinely separate occurrences.
    const subscriptions = s.engine.subTriggers.subscriptionsFor("whenHandTrashed");
    const armed = ["first", "second", "third"].flatMap((instanceId) =>
      armedSubTriggers(s.engine, subscriptions, {
        handTrashedSeat: 0,
        byEffectSeat: 0,
        handTrashedInstanceIds: [instanceId],
      }),
    );
    expect(armed).toHaveLength(3);
    const resolving = runSubTriggersInChosenOrder(s.engine, armed);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    const [first, second, third] = prompt.options!.triggerKeys!;
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [second!, first!, third!],
          optionalAnswers: { [second!]: false, [first!]: false, [third!]: true },
        },
      }),
    ).toEqual({ ok: true });
    await resolving;
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.perm("matt").isSuspended).toBe(true);
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["orderTriggers"]);
  });
});
