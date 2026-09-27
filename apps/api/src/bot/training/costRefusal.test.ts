import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { createAsyncTrainingPolicy } from "./policy.js";
import { costRefusalForfeit, type TrainingForfeit } from "./costRefusal.js";
import "../../cards/index.js";

describe("training-only payment refusal forfeits", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) => [
      { seat, memory: 0, observed: true, mismatch: "none" },
      { seat, memory: 0, observed: false, mismatch: "none" },
      { seat, memory: 2, observed: true, mismatch: "none" },
      ...["source", "outsideCost", "selected", "turn"].map((mismatch) => ({
        seat,
        memory: 0,
        observed: true,
        mismatch,
      })),
    ]),
  )("seat=$seat memory=$memory observed=$observed mismatch=$mismatch", async ({ seat, memory, observed, mismatch }) => {
    const setup = setupEngine({
      [seat]: {
        hand: [{ card: "BT25-076", as: "played" }],
        battleArea: [{ card: "EX9-047", as: "payment", under: ["EX9-005"] }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = memory;
    await setup.ready();
    const forfeits: TrainingForfeit[] = [];
    const controller = costRefusalForfeit(setup.engine, seat, (failure) => forfeits.push(failure));
    const emit = setup.engine.hooks.emit;
    setup.engine.hooks.emit = (event) => {
      emit(event);
      if (event.kind === "actionRejected") {
        const turn = setup.state.turnCount;
        if (mismatch === "turn") setup.state.turnCount += 1;
        controller.onEngineRejection(event);
        setup.state.turnCount = turn;
      }
    };
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      const index =
        window.kind === "main"
          ? window.actions.findIndex((action) => action.intent.type === "playCard")
          : window.kind === "optional"
            ? 1
            : window.actions.findIndex((action) => action.label === "Finish selection");
      if (observed || window.kind === "main") {
        const paying = setup.engine.payingPlayCost;
        if (mismatch === "outsideCost") setup.engine.payingPlayCost = false;
        controller.observeChoice(
          {
            ...window,
            ...(mismatch === "source" && window.request !== undefined
              ? { request: { ...window.request, sourceInstanceId: "another-card" } }
              : {}),
            ...(mismatch === "selected" ? { selected: ["already-chosen"] } : {}),
          },
          index,
        );
        setup.engine.payingPlayCost = paying;
      }
      return index;
    });
    const id = setup.inst("played").instanceId;
    const intent = await policy.chooseMainAction(buildBotView(setup.state, seat)!);
    expect(intent).toEqual({ type: "playCard", instanceId: id });
    expect(setup.engine.applyIntent(seat, intent)).toEqual({ ok: true });
    for (let step = 0; step < 12; step++) {
      await settle();
      const pending = setup.state.pendingDecision;
      if (pending === undefined) {
        if (setup.engine.mainVerbContinuationsInFlight === 0) break;
        continue;
      }
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      const answer = await policy.answerDecision(buildBotView(setup.state, seat), request);
      controller.onEngineRejection({ kind: "actionRejected", intent: "playCard", reason: "illegal-target" });
      controller.onEngineRejection({ kind: "actionRejected", intent: "digivolve", reason: "insufficient-memory" });
      expect(forfeits).toEqual([]);
      expect(setup.engine.applyIntent(seat, answer)).toEqual({ ok: true });
    }
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    const shouldForfeit = observed && memory === 0 && mismatch === "none";
    expect(forfeits).toEqual(shouldForfeit ? [{ kind: "unaffordablePaymentRefusal", sourceInstanceId: id }] : []);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual(
      memory === 0 ? [{ kind: "actionRejected", intent: "playCard", reason: "insufficient-memory" }] : [],
    );
    expect(setup.events.filter((event) => event.kind === "gameOver" && event.reason === "surrender")).toEqual(
      shouldForfeit
        ? [{ kind: "gameOver", result: { outcome: "win", winnerSeat: seat === 0 ? 1 : 0 }, reason: "surrender" }]
        : [],
    );
    expect(setup.state.pendingDecision).toBeUndefined();
    // Receiving the same event again must never create a second training penalty.
    controller.onEngineRejection({ kind: "actionRejected", intent: "playCard", reason: "insufficient-memory" });
    expect(forfeits).toHaveLength(shouldForfeit ? 1 : 0);
  });
});
