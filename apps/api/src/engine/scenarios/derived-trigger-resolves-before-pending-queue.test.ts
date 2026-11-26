import type { DecisionRequest } from "@aegis/shared/protocol/events";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/derived-trigger-resolves-before-pending-queue.fixture";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { drainMicrotasks, settle } from "#api/engine/testkit/harness";

const describeQueue = (entries: readonly EffectQueueEntry[] | undefined) =>
  entries?.map(({ seat, sourceCardId, sourceZone, position, lastPosition, isResolving }) => ({
    seat,
    sourceCardId,
    sourceZone,
    position,
    lastPosition,
    isResolving,
  }));

it("resolves the derived deletion triggers of both players before the turn player's pending start-of-main effect", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: false });
  const loop = s.engine.startTurnLoop();
  const findRequest = (): DecisionRequest =>
    s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)!.req;
  try {
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision !== undefined);
    const order = findRequest();
    expect(order.kind).toBe("orderTriggers");
    expect(order.seat).toBe(0);
    const cardIds = order.options?.triggerCardIds ?? [];
    expect([...cardIds].sort()).toEqual(["AD1-019", "EX6-006"]);
    expect(describeQueue(JSON.parse(s.state.effectQueueJson) as EffectQueueEntry[])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seat: 0,
          sourceCardId: "EX6-006",
          sourceZone: "breeding",
          position: 1,
          lastPosition: 2,
        }),
        expect.objectContaining({
          seat: 0,
          sourceCardId: "AD1-019",
          sourceZone: "battleArea",
          position: 1,
          lastPosition: 2,
        }),
      ]),
    );
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: {
          kind: "orderTriggers",
          order: [],
          orderIndexes: [cardIds.indexOf("EX6-006"), cardIds.indexOf("AD1-019")],
        },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();
    await settle(() => s.state.pendingDecision === undefined && JSON.parse(s.state.effectQueueJson).length === 0);

    const narrated = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && ["EX6-006", "ST16-07", "BT3-092", "AD1-019"].includes(event.sourceCardId)
        ? [event]
        : [],
    );
    expect(narrated.map((event) => [event.seat, event.sourceCardId])).toEqual([
      [0, "EX6-006"],
      [0, "ST16-07"],
      [1, "BT3-092"],
      [0, "AD1-019"],
    ]);
    expect(narrated.map((event) => describeQueue(event.effectQueue))).toEqual([
      [
        {
          seat: 0,
          sourceCardId: "EX6-006",
          sourceZone: "breeding",
          position: 1,
          lastPosition: undefined,
          isResolving: true,
        },
        {
          seat: 0,
          sourceCardId: "AD1-019",
          sourceZone: "battleArea",
          position: 2,
          lastPosition: undefined,
          isResolving: undefined,
        },
      ],
      [
        {
          seat: 0,
          sourceCardId: "ST16-07",
          sourceZone: "trash",
          position: 1,
          lastPosition: undefined,
          isResolving: true,
        },
        {
          seat: 1,
          sourceCardId: "BT3-092",
          sourceZone: "battleArea",
          position: 2,
          lastPosition: undefined,
          isResolving: undefined,
        },
        {
          seat: 0,
          sourceCardId: "AD1-019",
          sourceZone: "battleArea",
          position: 3,
          lastPosition: undefined,
          isResolving: undefined,
        },
      ],
      [
        {
          seat: 1,
          sourceCardId: "BT3-092",
          sourceZone: "battleArea",
          position: 1,
          lastPosition: undefined,
          isResolving: true,
        },
        {
          seat: 0,
          sourceCardId: "AD1-019",
          sourceZone: "battleArea",
          position: 2,
          lastPosition: undefined,
          isResolving: undefined,
        },
      ],
      [
        {
          seat: 0,
          sourceCardId: "AD1-019",
          sourceZone: "battleArea",
          position: 1,
          lastPosition: undefined,
          isResolving: true,
        },
      ],
    ]);
    for (const event of narrated) {
      const resolving = event.effectQueue?.find((entry) => entry.isResolving);
      expect(resolving).toEqual(expect.objectContaining({ seat: event.seat, sourceCardId: event.sourceCardId }));
    }
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["AD1-019"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("ST16-07");
    expect(s.state.memory).toBe(memoryBefore + 1 - 1 + 1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
