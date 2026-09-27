import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Abbadomon end-of-turn placement and deletion through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((opponentTurn) => [
        { seat, opponentTurn, payment: -1, target: -1 },
        ...[0, 1].flatMap((payment) => [0, 1].map((target) => ({ seat, opponentTurn, payment, target }))),
      ]),
    ),
  )(
    "seat=$seat opponentTurn=$opponentTurn payment=$payment target=$target",
    async ({ seat, opponentTurn, payment, target }) => {
      const opponent = seat === 0 ? 1 : 0;
      const endingSeat = opponentTurn ? opponent : seat;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            {
              card: "EX9-055",
              as: "source",
              under: [
                { card: "EX9-005", as: "old-egg" },
                { card: "EX9-046", as: "old-digimon" },
              ],
            },
          ],
          trash: [
            { card: "EX9-047", as: "payment-0" },
            { card: "EX9-054", as: "payment-1" },
            { card: "EX9-005", as: "egg" },
            { card: "EX9-057", as: "too-high" },
            { card: "BT25-032", as: "wrong-text" },
          ],
          hand: [{ card: "EX9-046", as: "own-hand" }],
        },
        [opponent]: {
          battleArea: [
            { card: "EX9-048", as: "target-0-0" },
            { card: "EX9-048", as: "target-0-1" },
            { card: "EX9-054", as: "target-1-0" },
            { card: "EX9-054", as: "target-1-1" },
            { card: "EX9-046", as: "wrong-level" },
            { card: "BT6-090", as: "tamer" },
          ],
          breeding: { card: "EX9-048", as: "breeding", under: ["EX9-005"] },
          hand: [{ card: "EX9-046", as: "other-hand" }],
        },
      });
      setup.state.turnSeat = endingSeat;
      setup.state.memory = 3;
      await setup.ready();
      setup.state.isFirstPlayersFirstTurn = true;
      const payments = [0, 1].map((index) => setup.inst(`payment-${index}`).instanceId);
      const targets = [0, 1].map((level) => [0, 1].map((index) => setup.perm(`target-${level}-${index}`).permanentId));
      const targetCards = [0, 1].map((level) =>
        [0, 1].map((index) => setup.inst(`target-${level}-${index}`).instanceId),
      );
      const board = setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId);
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main" || window.kind === "breeding")
          return window.actions.findIndex(({ intent }) => intent.type === "endPhase");
        windows.push(window);
        if (window.kind === "optional") return payment < 0 ? 1 : 0;
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex(
          (action) => action.sourceId === payments[payment] || action.sourceId === targets[payment]?.[target],
        );
      });
      const otherPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
        await Promise.resolve();
        if (window.kind === "main" || window.kind === "breeding")
          return window.actions.findIndex(({ intent }) => intent.type === "endPhase");
        expect(window.kind).toBe("optional");
        return 1;
      });
      let finished = false;
      const turn = setup.engine.runOneTurn().then(() => {
        finished = true;
      });
      await settle(() => setup.engine.mainPhase.isOpen || setup.engine.breeding.isOpen);
      if (setup.engine.breeding.isOpen) {
        const breedingIntent = await (opponentTurn ? otherPolicy : policy).chooseBreedingAction(
          buildBotView(setup.state, endingSeat)!,
        );
        expect(setup.engine.applyIntent(endingSeat, breedingIntent)).toEqual({ ok: true });
        await settle(() => setup.engine.mainPhase.isOpen);
      }
      expect(
        setup.engine.applyIntent(
          endingSeat,
          await (opponentTurn ? otherPolicy : policy).chooseMainAction(buildBotView(setup.state, endingSeat)!),
        ),
      ).toEqual({ ok: true });
      for (let step = 0; step < 24; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || finished);
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        const answering = request.seat === seat ? policy : otherPolicy;
        expect(
          setup.engine.applyIntent(
            request.seat,
            await answering.answerDecision(buildBotView(setup.state, request.seat), request),
          ),
        ).toEqual({ ok: true });
        await settle();
      }
      expect(finished).toBe(true);
      await turn;
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
      expect(
        windows
          .filter((window) => window.kind !== "optional" && window.selected.length === 0)
          .map((window) => window.actions.map((action) => action.sourceId)),
      ).toEqual(payment < 0 ? [] : [payments, targets[payment]]);
      expect(setup.perm("source").stack.map((card) => card.instanceId)).toEqual([
        setup.inst("old-egg").instanceId,
        setup.inst("old-digimon").instanceId,
        ...(payment < 0 ? [] : [payments[payment]]),
      ]);
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([
        ...payments.filter((_, index) => index !== payment),
        setup.inst("egg").instanceId,
        setup.inst("too-high").instanceId,
        setup.inst("wrong-text").instanceId,
      ]);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.permanentId)).toEqual(
        board.filter((id) => payment < 0 || id !== targets[payment]![target]),
      );
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual(
        payment < 0 ? [] : [targetCards[payment]![target]],
      );
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
        setup.inst("own-hand").instanceId,
      ]);
      expect(setup.state.players[opponent]!.hand.map((card) => card.instanceId)).toEqual([
        setup.inst("other-hand").instanceId,
      ]);
      expect(setup.state.players[opponent]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    },
  );
});
