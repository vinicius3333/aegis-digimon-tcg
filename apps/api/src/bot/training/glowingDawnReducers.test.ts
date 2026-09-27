import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Glowing Dawn paid cost reductions through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["BT25-049", "ST23-03"].flatMap((card) => [-1, 0, 1].map((payer) => ({ seat, card, payer }))),
    ),
  )("seat=$seat reducer=$card payer=$payer", async ({ seat, card, payer }) => {
    const opponent = seat === 0 ? 1 : 0;
    const option = card === "BT25-049";
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card, as: "source" },
          ...[0, 1].map((index) => ({
            card: "ST23-13",
            as: `tamer-${index}`,
            suspended: true,
            under: [
              { card: "ST23-06", as: `visible-${index}`, faceUp: true },
              { card: "BT25-032", as: `bottom-${index}`, faceUp: false },
              { card: "BT26-025", as: `next-${index}`, faceUp: false },
            ],
          })),
          { card: "ST23-13", as: "ineligible", suspended: true, under: [{ card: "ST23-06", faceUp: true }] },
        ],
        hand: (option ? [0, 1] : [0]).map((index) => ({ card: "BT26-031", as: `played-${index}` })),
        deck: [
          { card: "EX9-046", as: "draw" },
          { card: "EX9-048", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [
          { card: "EX9-055", as: "target", dp: 30000 },
          { card: "ST23-13", as: "opposing-tamer", suspended: true, under: [{ card: "ST23-06", faceUp: false }] },
        ],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const payerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
    const windows: TrainingWindow[] = [];
    const optionals: TrainingWindow[] = [];
    let playedIndex = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) =>
          option
            ? intent.type === "playCard" && intent.instanceId === setup.inst(`played-${playedIndex}`).instanceId
            : intent.type === "digivolve" &&
              intent.instanceId === setup.inst("played-0").instanceId &&
              intent.permanentId === setup.perm("source").permanentId &&
              intent.alternateRequirementIndex === 0,
        );
      if (window.kind === "orderTriggers") return 0;
      if (window.request?.sourceCardId === card) {
        if (window.kind === "optional") {
          optionals.push(window);
          return payer < 0 ? 1 : 0;
        }
        windows.push(window);
        return window.actions.findIndex((action) =>
          window.selected.length > 0 ? action.label === "Finish selection" : action.sourceId === payerIds[payer],
        );
      }
      expect(["BT26-031", undefined]).toContain(window.request?.sourceCardId);
      if (window.kind === "optional") return 1;
      const finish = window.actions.findIndex((action) => action.label === "Finish selection");
      if (finish >= 0) return finish;
      return window.actions.findIndex((action) => action.sourceId === setup.perm("target").permanentId);
    });
    for (const index of option ? [0, 1] : [0]) {
      playedIndex = index;
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
      for (let step = 0; step < 20; step++) {
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
    }
    expect(optionals).toHaveLength(option && payer < 0 ? 2 : 1);
    expect(windows).toHaveLength(payer < 0 ? 0 : 2);
    expect(windows[0]?.actions.map((action) => action.sourceId)).toEqual(payer < 0 ? undefined : payerIds);
    for (const index of [0, 1])
      expect(setup.perm(`tamer-${index}`).stack.map((item) => item.instanceId)).toEqual(
        [`visible-${index}`, ...(payer === index ? [] : [`bottom-${index}`]), `next-${index}`].map(
          (alias) => setup.inst(alias).instanceId,
        ),
      );
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId).sort()).toEqual(
      [
        ...(payer < 0 ? [] : [setup.inst(`bottom-${payer}`).instanceId]),
        ...(option ? [setup.inst("played-0").instanceId, setup.inst("played-1").instanceId] : []),
      ].sort(),
    );
    expect(setup.state.memory).toBe(option ? (payer < 0 ? 2 : 5) : payer < 0 ? 7 : 9);
    expect(setup.perm("target").currentDP).toBe(option ? 14000 : 30000);
    expect(setup.perm("source").topCard.instanceId).toBe(setup.inst(option ? "source" : "played-0").instanceId);
    expect(setup.perm("source").stack.map((item) => item.instanceId)).toEqual(
      option ? [] : [setup.inst("source").instanceId],
    );
    expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual(
      option ? [] : [setup.inst("draw").instanceId],
    );
    expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([
      ...(option ? [setup.inst("draw").instanceId] : []),
      setup.inst("tail").instanceId,
    ]);
    expect(setup.perm("ineligible").stack).toHaveLength(1);
    expect(setup.perm("opposing-tamer").stack).toHaveLength(1);
    expect(setup.state.players[seat]!.security).toHaveLength(0);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });
});
