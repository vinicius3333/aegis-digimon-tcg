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
    // Drive the production bus seam for two deferred discard events; the public digivolution
    // witness below instead drains the same occurrences through the mixed stack resolver.
    const subscriptions = s.engine.subTriggers.subscriptionsFor("whenTrashedFromHand");
    const armed = ["first", "second", "third"].flatMap((instanceId) =>
      armedSubTriggers(s.engine, subscriptions, {
        handTrashedSeat: 0,
        byEffectSeat: 0,
        trashedFromHandCardId: "BT1-010",
        trashedFromHandInstanceId: instanceId,
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
  it.each([false, true])("keeps Matt's second pending answer distinct (reverse order: %s)", async (reverse) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST16-14", as: "matt" },
            { card: "ST6-08", as: "base" },
          ],
          hand: [{ card: "BT3-088", as: "lady" }, "BT1-010", "BT1-011"],
          deck: Array(8).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    expect(prompt.options!.triggerCardIds).toEqual(["ST16-14", "ST16-14"]);
    const order = [...prompt.options!.triggerKeys!];
    if (reverse) order.reverse();
    expect(new Set(order).size).toBe(2);
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "orderTriggers", order, optionalAnswers: { [order[0]!]: false, [order[1]!]: true } },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(memoryBefore + 1);
    expect(s.perm("matt").isSuspended).toBe(true);
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "ST16-14"),
    ).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
  });
});
