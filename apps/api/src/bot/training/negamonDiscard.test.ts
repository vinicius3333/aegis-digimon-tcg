import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("EX9-048 hand payment and draw through the asynchronous policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => [-2, -1, 0, 1].map((choice) => ({ seat, choice }))))(
    "seat=$seat choice=$choice",
    async ({ seat, choice }) => {
      const opponent = seat === 0 ? 1 : 0;
      const payable = choice !== -2;
      const setup = setupEngine({
        [seat]: {
          hand: [
            { card: "EX9-048", as: "played" },
            ...(payable
              ? [
                  { card: "EX9-054", as: "payment-0" },
                  { card: "EX9-055", as: "payment-1" },
                ]
              : []),
            { card: "BT1-009", as: "ineligible" },
          ],
          deck: [
            { card: "EX9-046", as: "draw-0" },
            { card: "EX9-047", as: "draw-1" },
          ],
        },
        [opponent]: { hand: [{ card: "EX9-054", as: "opponent-hand" }] },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 10;
      await setup.ready();
      const payments = payable ? [setup.inst("payment-0").instanceId, setup.inst("payment-1").instanceId] : [];
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("played").instanceId,
          );
        windows.push(window);
        if (choice < 0) return window.actions.findIndex((action) => action.label === "Finish selection");
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex((action) => action.sourceId === payments[choice]);
      });
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 12; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(request.sourceCardId).toBe("EX9-048");
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({
          ok: true,
        });
      }
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      const paid = choice >= 0;
      expect(windows.map((window) => window.kind)).toEqual(
        choice === -2 ? [] : paid ? ["selectCards", "selectCards"] : ["selectCards"],
      );
      expect(
        windows
          .filter((window) => window.kind === "selectCards" && window.selected.length === 0)
          .map((window) => window.actions.map((action) => action.sourceId)),
      ).toEqual(payable ? [[...payments, undefined]] : []);
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("played").instanceId,
      ]);
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
        ...payments.filter((_, index) => !paid || index !== choice),
        setup.inst("ineligible").instanceId,
        ...(paid ? [setup.inst("draw-0").instanceId, setup.inst("draw-1").instanceId] : []),
      ]);
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
        (paid ? [] : ["draw-0", "draw-1"]).map((alias) => setup.inst(alias).instanceId),
      );
      expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(paid ? [payments[choice]] : []);
      expect(setup.state.players[opponent]!.hand.map((card) => card.instanceId)).toEqual([
        setup.inst("opponent-hand").instanceId,
      ]);
    },
  );
});
