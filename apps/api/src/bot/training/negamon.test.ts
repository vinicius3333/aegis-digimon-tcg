import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const cases = [0, 2, 4].flatMap((trashCount) =>
  [false, true].flatMap((reverse) =>
    [false, true].flatMap((place) =>
      (place ? [0, 1, 2, 3] : [3]).map((omitIndex) => ({ trashCount, reverse, place, omitIndex, move: true })),
    ),
  ),
);
cases.push({ trashCount: 2, reverse: false, place: false, omitIndex: 3, move: false });

describe("Abbadomon Core mixed-zone payments through the asynchronous policy", () => {
  it.each(cases)(
    "trash=$trashCount reverse=$reverse place=$place omit=$omitIndex move=$move",
    async ({ trashCount, reverse, place, omitIndex, move }) => {
      const eggs = Array.from({ length: 4 }, (_, index) => ({ card: "EX9-005", as: `egg-${index}` }));
      const setup = setupEngine(
        {
          0: {
            breeding: { card: "EX9-057", as: "core" },
            battleArea: [
              { card: "EX9-047", as: "host-0", under: eggs.slice(trashCount).filter((_, index) => index % 2 === 0) },
              { card: "EX9-047", as: "host-1", under: eggs.slice(trashCount).filter((_, index) => index % 2 === 1) },
            ],
            trash: [
              ...eggs.slice(0, trashCount),
              { card: "EX9-047", as: "place-0" },
              { card: "EX9-048", as: "place-1" },
              { card: "EX9-055", as: "place-2" },
              { card: "EX9-054", as: "unpaid" },
            ],
            security: ["EX9-046", "EX9-046"],
          },
          1: {
            battleArea: [
              { card: "EX9-055", as: "attacker" },
              { card: "EX9-048", as: "lowest" },
            ],
          },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.turnSeat = 1;
      await setup.ready();
      const coreId = setup.perm("core").permanentId;
      const eggIds = eggs.map(({ as }) => setup.inst(as).instanceId);
      const allPlaceIds = [
        ...[0, 1, 2].map((index) => setup.inst(`place-${index}`).instanceId),
        setup.inst("unpaid").instanceId,
      ];
      const placeIds = allPlaceIds.filter((_, index) => index !== omitIndex);
      const unpaidId = allPlaceIds[omitIndex]!;
      const coreTopId = setup.inst("core").instanceId;
      const triggerChoices: (string | undefined)[] = [];
      const placementCandidates: (string | undefined)[][] = [];
      const securityId = setup.state.players[0]!.security[0]!.instanceId;
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
        await Promise.resolve();
        windows.push(window);
        if (window.kind === "orderTriggers") {
          const selected = reverse ? window.actions.length - 1 : 0;
          triggerChoices.push(window.actions[selected]?.sourceId);
          return selected;
        }
        if (
          window.selected.length === 0 &&
          window.actions.some((action) => allPlaceIds.includes(action.sourceId ?? ""))
        )
          placementCandidates.push(window.actions.map((action) => action.sourceId).filter((id) => id !== undefined));
        if (window.request?.sourceCardId === "EX9-005")
          return window.kind === "optional"
            ? 1
            : window.actions.findIndex((action) => action.label === "Finish selection");
        const block = window.actions.findIndex(
          ({ intent }) => intent.type === "declareBlock" && intent.blockerPermanentId === coreId,
        );
        const declineBlock = window.actions.findIndex(({ intent }) => intent.type === "declineBlock");
        if (declineBlock >= 0) return move ? block : declineBlock;
        if (window.kind === "optional") return (setup.state.players[0]!.breeding === undefined ? place : move) ? 0 : 1;
        const finish = window.actions.findIndex((action) => action.label === "Finish selection");
        const isReturn = window.actions.some((action) => eggIds.includes(action.sourceId ?? ""));
        const ids = isReturn ? eggIds : placeIds;
        if (!(isReturn ? move : place)) return finish;
        const order = reverse ? [...ids].reverse() : ids;
        const next = order.find(
          (id) => !window.selected.includes(id) && window.actions.some((action) => action.sourceId === id),
        );
        if (next !== undefined) return window.actions.findIndex((action) => action.sourceId === next);
        if (finish >= 0) return finish;
        throw new Error(`Unexpected Core decision: ${JSON.stringify(window.actions)}`);
      });
      expect(
        setup.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: setup.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      let blocked = false;
      for (let step = 0; step < 32; step++) {
        await settle();
        const pending = setup.state.pendingDecision;
        if (pending !== undefined) {
          const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
          expect(
            setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request)),
          ).toEqual({ ok: true });
          continue;
        }
        const block = setup.events.find((event) => event.kind === "blockWindowOpened");
        if (block?.kind === "blockWindowOpened" && !blocked) {
          blocked = true;
          expect(
            setup.engine.applyIntent(
              0,
              await policy.chooseBlockResponse(buildBotView(setup.state, 0)!, {
                ...block,
                mustBlock: block.mustBlock ?? false,
                targetsPlayer: true,
              }),
            ),
          ).toEqual({ ok: true });
          continue;
        }
        if (!setup.engine.combat.isAttacking) break;
      }
      await settle();
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(setup.state.players[0]!.breeding === undefined).toBe(move);
      expect(setup.state.players[0]!.eggDeck.map((card) => card.instanceId).sort()).toEqual(
        move ? [...eggIds].sort() : [],
      );
      expect(setup.perm("core").stack.map((card) => card.instanceId)).toEqual(
        move && place ? (reverse ? [...placeIds].reverse() : placeIds) : [],
      );
      for (const hostIndex of [0, 1]) {
        expect(setup.perm(`host-${hostIndex}`).stack.map((card) => card.instanceId)).toEqual(
          move ? [] : eggIds.slice(trashCount).filter((_, index) => index % 2 === hostIndex),
        );
      }
      expect(setup.perm("core").stack.every((card) => card.faceUp)).toBe(true);
      expect(setup.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
        [
          unpaidId,
          ...(move && place ? [] : placeIds),
          ...(move ? [] : [...eggIds.slice(0, trashCount), securityId]),
        ].sort(),
      );
      expect(blocked).toBe(move);
      expect(setup.state.players[0]!.security).toHaveLength(move ? 2 : 1);
      expect(setup.state.players[1]!.battleArea.map((unit) => unit.topCard.cardId)).toEqual(
        move ? (place ? [] : ["EX9-048"]) : ["EX9-055", "EX9-048"],
      );
      expect(setup.state.memory).toBe(0);
      expect(windows.length).toBeGreaterThan(0);
      expect(triggerChoices.length > 0).toBe(trashCount < 4);
      expect(triggerChoices[0]?.startsWith(`${coreTopId}::`)).toBe(trashCount < 4 ? reverse : undefined);
      expect(placementCandidates).toEqual(move && place ? [expect.arrayContaining(allPlaceIds)] : []);
    },
  );
});
