import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Habakirimon largest-security choices through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [1, 2, 3].flatMap((opponentCount) =>
        ["decline", ...(opponentCount <= 2 ? ["mine"] : []), ...(opponentCount >= 2 ? ["opponent"] : [])].map(
          (choice) => ({ seat, opponentCount, choice }),
        ),
      ),
    ),
  )("seat=$seat opposing-security=$opponentCount choice=$choice", async ({ seat, opponentCount, choice }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [{ card: "BT25-041", as: "base", suspended: true }],
        hand: [{ card: "BT25-043", as: "evolution" }],
        security: [{ card: "BT25-032", as: "own-security" }],
        deck: [
          { card: "BT25-049", as: "draw" },
          { card: "ST23-04", as: "recovery" },
          { card: "BT26-025", as: "tail" },
        ],
      },
      [opponent]: {
        security: Array.from({ length: opponentCount }, (_, index) => ({ card: "EX9-046", as: `opponent-${index}` })),
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) =>
            intent.type === "digivolve" &&
            intent.instanceId === setup.inst("evolution").instanceId &&
            intent.permanentId === setup.perm("base").permanentId &&
            intent.alternateRequirementIndex === 0,
        );
      windows.push(window);
      if (window.selected.length || choice === "decline")
        return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex((action) => action.sourceId === choice);
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
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(
      windows
        .filter((window) => !window.selected.length)
        .map((window) => window.actions.map((action) => action.sourceId)),
    ).toEqual([[...(opponentCount <= 2 ? ["mine"] : []), ...(opponentCount >= 2 ? ["opponent"] : []), undefined]]);
    expect(setup.perm("base").isSuspended).toBe(choice === "decline");
    expect(setup.perm("base").topCard.instanceId).toBe(setup.inst("evolution").instanceId);
    expect(setup.perm("base").stack.map((card) => card.instanceId)).toEqual([setup.inst("base").instanceId]);
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual([
      ...(choice !== "mine" ? [setup.inst("recovery").instanceId] : []),
      setup.inst("own-security").instanceId,
    ]);
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(
      choice === "mine" ? [setup.inst("recovery").instanceId] : [],
    );
    const opposingSecurity = Array.from(
      { length: opponentCount },
      (_, index) => setup.inst(`opponent-${index}`).instanceId,
    );
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual(
      choice === "opponent" ? opposingSecurity.slice(1) : opposingSecurity,
    );
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual(
      choice === "opponent" ? [opposingSecurity[0]] : [],
    );
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([setup.inst("draw").instanceId]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([setup.inst("tail").instanceId]);
    expect(setup.state.memory).toBe(7);
  });
});
