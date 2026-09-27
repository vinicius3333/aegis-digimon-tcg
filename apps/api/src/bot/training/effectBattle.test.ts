import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("scoped effect battles through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) => [
      { seat, targetIndex: -1, difference: -1000 },
      ...[0, 1].flatMap((targetIndex) => [-1000, 0, 1000].map((difference) => ({ seat, targetIndex, difference }))),
    ]),
  )(
    "seat=$seat selects Monarchlizamon battle target $targetIndex (defender DP difference=$difference)",
    async ({ seat, targetIndex, difference }) => {
      const opponent = seat === 0 ? 1 : 0;
      const defenderDP = getCardDefinition("BT25-057")!.dp! + difference;
      const setup = setupEngine({
        [seat]: {
          battleArea: [{ card: "BT25-035", as: "host" }],
          hand: [{ card: "BT25-057", as: "monarch" }],
          deck: [{ card: "EX9-046", as: "draw" }],
        },
        [opponent]: {
          battleArea: [
            { card: "EX9-047", as: "target-0", dp: defenderDP },
            { card: "EX9-048", as: "target-1", dp: defenderDP },
            { card: "BT6-090", as: "tamer" },
          ],
          breeding: { card: "EX9-046", as: "breeding", under: ["EX9-005"] },
          security: ["EX9-046", "EX9-046"],
          deck: ["EX9-046"],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const targetIds = [setup.perm("target-0").permanentId, setup.perm("target-1").permanentId];
      const targetCardIds = [setup.inst("target-0").instanceId, setup.inst("target-1").instanceId];
      const hostId = setup.perm("host").permanentId;
      const baseId = setup.inst("host").instanceId;
      const monarchId = setup.inst("monarch").instanceId;
      const host = setup.perm("host");
      const targetWindows: TrainingWindow[] = [];
      const optionalWindows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) =>
              intent.type === "digivolve" &&
              intent.instanceId === monarchId &&
              intent.permanentId === hostId &&
              intent.alternateRequirementIndex === 2,
          );
        if (window.kind === "optional") {
          optionalWindows.push(window);
          return targetIndex < 0 ? 1 : 0;
        }
        if (window.actions.some((action) => targetIds.includes(action.sourceId ?? "")) || window.selected.length > 0) {
          targetWindows.push(window);
          return window.selected.length > 0
            ? window.actions.findIndex((action) => action.label === "Finish selection")
            : window.actions.findIndex((action) => action.sourceId === targetIds[targetIndex]);
        }
        return 0;
      });
      const opponentPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
        await Promise.resolve();
        expect(window.kind).toBe("optional");
        return 1;
      });
      const declaration = await policy.chooseMainAction(buildBotView(setup.state, seat)!);
      expect(declaration).toEqual({
        type: "digivolve",
        permanentId: hostId,
        instanceId: monarchId,
        alternateRequirementIndex: 2,
      });
      expect(setup.engine.applyIntent(seat, declaration)).toEqual({ ok: true });
      for (let step = 0; step < 16; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (pending === undefined) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        const answeringPolicy = request.seat === seat ? policy : opponentPolicy;
        expect(
          setup.engine.applyIntent(
            request.seat,
            await answeringPolicy.answerDecision(buildBotView(setup.state, request.seat), request),
          ),
        ).toEqual({ ok: true });
        await settle();
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(optionalWindows).toHaveLength(1);
      expect(optionalWindows[0]!.request?.sourceCardId).toBe("BT25-057");
      expect(targetWindows).toHaveLength(targetIndex < 0 ? 0 : 2);
      expect(targetWindows[0]?.actions.map((action) => action.sourceId)).toEqual(
        targetIndex < 0 ? undefined : targetIds,
      );
      const defenderDeleted = targetIndex >= 0 && difference <= 0;
      const attackerDeleted = targetIndex >= 0 && difference >= 0;
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([
        ...targetIds.filter((_, index) => !defenderDeleted || index !== targetIndex),
        setup.perm("tamer").permanentId,
      ]);
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual(
        defenderDeleted ? [targetCardIds[targetIndex]] : [],
      );
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.permanentId)).toEqual(
        attackerDeleted ? [] : [hostId],
      );
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId).sort()).toEqual(
        attackerDeleted ? [baseId, monarchId].sort() : [],
      );
      expect(host.isSuspended).toBe(false);
      expect(setup.state.players[seat]!.battleArea[0]?.topCard.instanceId).toBe(
        attackerDeleted ? undefined : monarchId,
      );
      expect(setup.state.players[seat]!.battleArea[0]?.stack.map((card) => card.instanceId)).toEqual(
        attackerDeleted ? undefined : [baseId],
      );
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([setup.inst("draw").instanceId]);
      expect(setup.state.players[opponent]!.security).toHaveLength(2);
      expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
      expect(setup.state.memory).toBe(7);
      expect(
        setup.events.filter((event) => event.kind === "attackDeclared" || event.kind === "actionRejected"),
      ).toEqual([]);
    },
  );
});
