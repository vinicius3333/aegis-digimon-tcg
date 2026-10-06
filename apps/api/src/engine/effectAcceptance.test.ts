import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { analyzePresentationEvents } from "../bot/presentationOracle.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import "../cards/index.js";

function triggers(s: EngineSetup) {
  return s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-130");
}

async function optionalMove() {
  const s = setupEngine(
    { 0: { breeding: { card: "AD1-001", as: "bred" }, hand: [{ card: "P-130", as: "tamer" }] } },
    { autoSelectCards: true },
  );
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  return s;
}

function answer(s: EngineSetup, accept: boolean) {
  const pending = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "optional", accept },
    }),
  ).toEqual({ ok: true });
}

function indexOf(s: EngineSetup, predicate: (event: ServerEvent) => boolean) {
  return s.events.findIndex(predicate);
}

describe("accepted effect presentation", () => {
  it("keeps an optional clause in its question until accepted, then announces before the result", async () => {
    const s = await optionalMove();
    const request = s.decisions.at(-1)!.req;
    expect(request).toMatchObject({ sourceCardId: "P-130", sourceInstanceId: s.inst("tamer").instanceId });
    expect(request.options?.effectText).toContain("[On Play]");
    expect(request.options).toMatchObject({ activationConfirmation: true, effectKey: expect.any(String) });
    expect(triggers(s)).toHaveLength(0);
    answer(s, true);
    await settle(() => s.decisions.length >= 2 && s.state.pendingDecision?.kind === "optional");
    expect(triggers(s)).toHaveLength(1);
    expect(triggers(s)[0]).toMatchObject({ effectKey: request.options!.effectKey });
    expect(s.decisions.at(-1)!.req.options).toMatchObject({ activationConfirmation: true });
    expect(s.decisions.at(-1)!.req.options!.effectKey).not.toBe(request.options!.effectKey);
    const triggerAt = indexOf(s, (event) => event.kind === "effectTriggered" && event.sourceCardId === "P-130");
    const moveAt = indexOf(s, (event) => event.kind === "cardsMoved" && event.from === "breeding");
    expect(triggerAt).toBeGreaterThanOrEqual(0);
    expect(moveAt).toBeGreaterThan(triggerAt);
    answer(s, false);
    await settle(() => s.state.pendingDecision === undefined);
    expect(triggers(s)).toHaveLength(1);
    expect(analyzePresentationEvents(s.events).anomalies).toEqual([]);
  });

  it("never opens an effect unit for a declined optional clause", async () => {
    const s = await optionalMove();
    answer(s, false);
    await settle(() => s.state.pendingDecision === undefined);
    expect(triggers(s)).toHaveLength(0);
    expect(s.state.players[0]!.breeding).toBeDefined();
    expect(analyzePresentationEvents(s.events).anomalies).toEqual([]);
  });

  it("announces an accepted watcher before paying its cost, with one balanced lifecycle", async () => {
    const s = await optionalMove();
    answer(s, true);
    await settle(() => s.decisions.length >= 2 && s.state.pendingDecision?.kind === "optional");
    expect(triggers(s)).toHaveLength(1);
    const before = s.events.length;
    answer(s, true);
    await settle(() => s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "P-130")?.isSuspended === true);
    await settle(() => s.state.pendingDecision === undefined);
    const events = s.events.slice(before);
    const watcher = events.findIndex((event) => event.kind === "effectTriggered" && event.sourceCardId === "P-130");
    const rotation = events.findIndex((event) => event.kind === "cardsMoved" || event.kind === "memoryChanged");
    expect(watcher).toBeGreaterThanOrEqual(0);
    expect(rotation).toBeGreaterThan(watcher);
    expect(triggers(s)).toHaveLength(2);
    expect(analyzePresentationEvents(s.events).anomalies).toEqual([]);
  });

  it("announces a direct Main ability with its exact source before its paid result", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-009", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    s.events.length = 0;
    const source = s.perm("source");
    const [entry] = JSON.parse(source.activatableEffectsJson) as { effectKey: string }[];
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.topCard!.instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectActivated"));
    expect(s.events.find((event) => event.kind === "effectActivated")).toMatchObject({ receiptOnly: true });
    const triggerAt = indexOf(s, (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT15-009");
    const resultAt = indexOf(s, (event) => event.kind === "memoryChanged");
    expect(triggerAt).toBeGreaterThanOrEqual(0);
    expect(s.events[triggerAt]).toMatchObject({
      sourceInstanceId: source.topCard!.instanceId,
      sourcePermanentId: source.permanentId,
    });
    expect(resultAt).toBeGreaterThan(triggerAt);
    expect(analyzePresentationEvents(s.events).anomalies).toEqual([]);
  });
});
