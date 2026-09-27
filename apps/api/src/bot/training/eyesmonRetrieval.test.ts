import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Eyesmon deletion retrieval through the asynchronous policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => [-1, 0, 1, 2].map((choice) => ({ seat, choice }))))(
    "seat=$seat choice=$choice",
    async ({ seat, choice }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [{ card: "EX9-047", as: "eyesmon" }],
          trash: [
            { card: "EX9-046", as: "return-0" },
            { card: "EX9-054", as: "return-1" },
            { card: "EX9-005", as: "egg" },
            { card: "BT25-020", as: "wrong-text" },
            { card: "BT6-090", as: "tamer" },
          ],
        },
        [opponent]: {
          battleArea: [{ card: "EX9-048", as: "defender", dp: 12000, suspended: true }],
          trash: [{ card: "EX9-046", as: "opponent-trash" }],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 3;
      await setup.ready();
      const attacker = setup.perm("eyesmon").permanentId;
      const defender = setup.perm("defender").permanentId;
      const eligible = ["return-0", "return-1", "eyesmon"].map((name) => setup.inst(name).instanceId);
      const originalTrash = setup.state.players[seat]!.trash.map((card) => card.instanceId);
      const selections: TrainingWindow[] = [];
      const optionals: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) =>
              intent.type === "attack" &&
              intent.attackerPermanentId === attacker &&
              intent.target.kind === "permanent" &&
              intent.target.permanentId === defender,
          );
        if (window.kind === "optional") {
          optionals.push(window);
          return choice < 0 ? 1 : 0;
        }
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        selections.push(window);
        return window.actions.findIndex((action) => action.sourceId === eligible[choice]);
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 12; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || !setup.engine.combat.isAttacking);
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(request.sourceCardId).toBe("EX9-047");
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(optionals).toHaveLength(1);
      expect(selections.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
        choice < 0 ? [] : [eligible],
      );
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
        choice < 0 ? [] : [eligible[choice]],
      );
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(
        [...originalTrash, eligible[2]].filter((id) => id !== eligible[choice]),
      );
      expect(setup.state.players[seat]!.battleArea).toHaveLength(0);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual([defender]);
      expect(setup.perm("defender").isSuspended).toBe(true);
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
        setup.inst("opponent-trash").instanceId,
      ]);
      expect(setup.state.memory).toBe(3);
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    },
  );
});
