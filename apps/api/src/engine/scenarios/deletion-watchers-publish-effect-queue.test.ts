import type { DecisionRequest } from "@aegis/shared/protocol/events";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/deletion-watchers-publish-effect-queue.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle } from "#api/engine/testkit/harness";

it("publishes the pending deletion watchers in turn-player-first order and narrows it as each resolves", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  const findRequest = (): DecisionRequest =>
    s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
  const published: EffectQueueEntry[][] = [];
  const field =
    Object.getOwnPropertyDescriptor(s.state, "effectQueueJson") ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(s.state), "effectQueueJson")!;
  Object.defineProperty(s.state, "effectQueueJson", {
    ...field,
    set(json: string) {
      published.push(JSON.parse(json) as EffectQueueEntry[]);
      field.set!.call(s.state, json);
    },
  });
  try {
    await advance(s.engine).waitForMainPhase(0);
    const piedmon = s.perm("piedmon").permanentId;
    const turnMaloMyotismon = s.perm("turnMaloMyotismon").permanentId;
    const otherMaloMyotismon = s.perm("otherMaloMyotismon").permanentId;
    const monodramonCard = s.perm("monodramon").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(monodramonCard);
    const order = findRequest();
    expect(order.kind).toBe("orderTriggers");
    expect(order.seat).toBe(0);
    expect([...(order.options?.triggerCardIds ?? [])].sort()).toEqual(["BT3-092", "EX1-064"]);
    expect(published.at(-1)!).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seat: 0,
          position: 1,
          lastPosition: 2,
          sourcePermanentId: piedmon,
          sourceZone: "battleArea",
        }),
        expect.objectContaining({ seat: 0, position: 1, lastPosition: 2, sourcePermanentId: turnMaloMyotismon }),
        expect.objectContaining({
          seat: 1,
          position: 3,
          sourcePermanentId: otherMaloMyotismon,
          sourceCardId: "BT3-092",
        }),
      ]),
    );
    expect(published.at(-1)!).toHaveLength(3);
    const publishedBeforeAnswer = published.length;
    const cardIds = order.options?.triggerCardIds ?? [];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: {
          kind: "orderTriggers",
          order: [],
          orderIndexes: [cardIds.indexOf("BT3-092"), cardIds.indexOf("EX1-064")],
        },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    await settle(() => s.state.pendingDecision === undefined && published.at(-1)!.length === 0);

    const afterAnswer = published.slice(publishedBeforeAnswer).map((entries) =>
      entries.map(({ sourcePermanentId, position, lastPosition, isResolving }) => ({
        sourcePermanentId,
        position,
        lastPosition,
        isResolving,
      })),
    );
    expect(afterAnswer).toEqual([
      [
        { sourcePermanentId: turnMaloMyotismon, position: 1, lastPosition: undefined, isResolving: true },
        { sourcePermanentId: piedmon, position: 2, lastPosition: undefined, isResolving: undefined },
        { sourcePermanentId: otherMaloMyotismon, position: 3, lastPosition: undefined, isResolving: undefined },
      ],
      [
        { sourcePermanentId: piedmon, position: 1, lastPosition: undefined, isResolving: undefined },
        { sourcePermanentId: otherMaloMyotismon, position: 2, lastPosition: undefined, isResolving: undefined },
      ],
      [
        { sourcePermanentId: piedmon, position: 1, lastPosition: undefined, isResolving: true },
        { sourcePermanentId: otherMaloMyotismon, position: 2, lastPosition: undefined, isResolving: undefined },
      ],
      [{ sourcePermanentId: otherMaloMyotismon, position: 1, lastPosition: undefined, isResolving: undefined }],
      [{ sourcePermanentId: otherMaloMyotismon, position: 1, lastPosition: undefined, isResolving: true }],
      [],
    ]);
    const narrated = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && (event.sourceCardId === "BT3-092" || event.sourceCardId === "EX1-064")
        ? [event]
        : [],
    );
    expect(narrated.map((event) => event.sourcePermanentId)).toEqual([turnMaloMyotismon, piedmon, otherMaloMyotismon]);
    expect(
      narrated.map((event) =>
        event.effectQueue?.map(({ sourcePermanentId, position, isResolving }) => ({
          sourcePermanentId,
          position,
          isResolving,
        })),
      ),
    ).toEqual([
      [
        { sourcePermanentId: turnMaloMyotismon, position: 1, isResolving: true },
        { sourcePermanentId: piedmon, position: 2, isResolving: undefined },
        { sourcePermanentId: otherMaloMyotismon, position: 3, isResolving: undefined },
      ],
      [
        { sourcePermanentId: piedmon, position: 1, isResolving: true },
        { sourcePermanentId: otherMaloMyotismon, position: 2, isResolving: undefined },
      ],
      [{ sourcePermanentId: otherMaloMyotismon, position: 1, isResolving: true }],
    ]);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
