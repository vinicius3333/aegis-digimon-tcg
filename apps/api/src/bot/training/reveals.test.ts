import { describe, expect, it } from "vitest";
import { Phase, getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { trainingObservation } from "./observation.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

const paths = [false, true].flatMap((moving) =>
  [0, 1, 2].flatMap((handIndex) =>
    [0, 1, 2]
      .filter((index) => index !== handIndex)
      .flatMap((underIndex) => [0, 1].map((tamerIndex) => ({ moving, handIndex, underIndex, tamerIndex }))),
  ),
);

describe("multi-destination reveals through the asynchronous policy", () => {
  it.each(paths)(
    "moving=$moving hand=$handIndex under=$underIndex tamer=$tamerIndex",
    async ({ moving, handIndex, underIndex, tamerIndex }) => {
      const source = { card: "ST23-06", as: "source" };
      const setup = setupEngine(
        {
          0: {
            ...(moving ? { breeding: source } : { hand: [source] }),
            battleArea: [0, 1].map((index) => ({
              card: "ST23-13",
              as: `tamer-${index}`,
              suspended: true,
              under: [{ card: "ST23-12", as: `old-${index}`, faceUp: false }],
            })),
            deck: [
              { card: "BT25-032", as: "reveal-0" },
              { card: "BT25-035", as: "reveal-1" },
              { card: "BT25-057", as: "reveal-2" },
              { card: "EX9-046", as: "unrevealed" },
            ],
          },
        },
        { autoOrderTriggers: false, autoOrderCards: false },
      );
      setup.state.memory = 10;
      if (moving) setup.state.phase = Phase.Breeding;
      await setup.ready();
      const sourceId = setup.inst("source").instanceId;
      const revealIds = [0, 1, 2].map((index) => setup.inst(`reveal-${index}`).instanceId);
      const oldIds = [0, 1].map((index) => setup.inst(`old-${index}`).instanceId);
      const tamerIds = [0, 1].map((index) => setup.perm(`tamer-${index}`).permanentId);
      const unseenId = setup.inst("unrevealed").instanceId;
      const groups = new Map<string, TrainingWindow>();
      const hosts: TrainingWindow[] = [];
      const initial = JSON.stringify(trainingObservation(setup.state, 0));
      for (const id of [...revealIds, unseenId]) expect(initial).not.toContain(id);
      const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === sourceId);
        if (window.kind === "breeding")
          return window.actions.findIndex(({ intent }) => intent.type === "moveFromBreeding");
        if (window.kind === "optional") return 1;
        if (window.selected.length > 0)
          return window.actions.findIndex((action) => action.label === "Finish selection");
        if (window.actions.some((action) => tamerIds.includes(action.sourceId ?? ""))) {
          hosts.push(window);
          return window.actions.findIndex((action) => action.sourceId === tamerIds[tamerIndex]);
        }
        const id = window.request!.decisionId;
        if (!groups.has(id)) groups.set(id, window);
        const wanted = groups.size === 1 ? revealIds[handIndex] : revealIds[underIndex];
        return window.actions.findIndex((action) => action.sourceId === wanted);
      });
      const view = buildBotView(setup.state, 0)!;
      const intent = moving ? await policy.chooseBreedingAction(view) : await policy.chooseMainAction(view);
      expect(setup.engine.applyIntent(0, intent)).toEqual({ ok: true });
      for (let step = 0; step < 24; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
        const pending = setup.state.pendingDecision;
        if (pending === undefined) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual(
          { ok: true },
        );
        await settle();
      }
      await settle(() => mainActionReady(setup.engine));
      expect(mainActionReady(setup.engine)).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      const selections = [...groups.values()];
      expect(selections).toHaveLength(2);
      expect(selections[0]!.actions.map((action) => action.sourceId)).toEqual(revealIds);
      expect(selections[1]!.actions.map((action) => action.sourceId)).toEqual(
        revealIds.filter((_, index) => index !== handIndex),
      );
      expect(hosts).toHaveLength(1);
      expect(hosts[0]!.actions.map((action) => action.sourceId)).toEqual(tamerIds);
      for (const selection of selections)
        expect(selection.observation.revealed.map(({ instanceId, cardId }) => ({ instanceId, cardId }))).toEqual(
          revealIds.map((instanceId, index) => ({ instanceId, cardId: ["BT25-032", "BT25-035", "BT25-057"][index] })),
        );
      expect(JSON.stringify(selections)).not.toContain(unseenId);
      expect(setup.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([revealIds[handIndex]]);
      expect(setup.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
        unseenId,
        ...revealIds.filter((_, index) => index !== handIndex && index !== underIndex),
      ]);
      for (const index of [0, 1]) {
        expect(setup.perm(`tamer-${index}`).stack.map((card) => card.instanceId)).toEqual(
          index === tamerIndex ? [revealIds[underIndex], oldIds[index]] : [oldIds[index]],
        );
        expect(setup.perm(`tamer-${index}`).stack.every((card) => !card.faceUp)).toBe(true);
      }
      expect(setup.state.players[0]!.breeding).toBeUndefined();
      expect(setup.state.memory).toBe(10 - (moving ? 0 : getCardDefinition("ST23-06")!.playCost));
      const known = trainingObservation(setup.state, 0).players[0]!.board.find(
        (unit) => unit.permanentId === tamerIds[tamerIndex],
      )!;
      expect(known.stack[0]!.instanceId).toBe(revealIds[underIndex]);
      expect(known.stack[0]!.cardId).toBe(["BT25-032", "BT25-035", "BT25-057"][underIndex]);
    },
  );
});

describe("overlapping revealed-card groups through the asynchronous policy", () => {
  it.each([
    [0, 1],
    [1, 0],
    [2, 0],
    [2, 1],
  ])("takes first slot %i and yellow slot %i", async (first, second) => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-032", as: "source" }],
          deck: [
            { card: "BT25-035", as: "reveal-0" },
            { card: "BT25-032", as: "reveal-1" },
            { card: "BT25-057", as: "reveal-2" },
            { card: "EX9-046", as: "unrevealed" },
          ],
        },
      },
      { autoOrderCards: false, autoOrderTriggers: false },
    );
    setup.state.memory = 10;
    await setup.ready();
    const sourceId = setup.inst("source").instanceId;
    const ids = [0, 1, 2].map((index) => setup.inst(`reveal-${index}`).instanceId);
    const unseenId = setup.inst("unrevealed").instanceId;
    const groups = new Map<string, TrainingWindow>();
    const policy = createAsyncTrainingPolicy(setup.engine, 0, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === sourceId);
      if (window.selected.length > 0) return window.actions.findIndex((action) => action.label === "Finish selection");
      const key = window.request!.decisionId;
      if (!groups.has(key)) groups.set(key, window);
      return window.actions.findIndex((action) => action.sourceId === ids[groups.size === 1 ? first : second]);
    });
    expect(setup.engine.applyIntent(0, await policy.chooseMainAction(buildBotView(setup.state, 0)!))).toEqual({
      ok: true,
    });
    for (let step = 0; step < 12; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (pending === undefined) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(setup.engine.applyIntent(0, await policy.answerDecision(buildBotView(setup.state, 0), request))).toEqual({
        ok: true,
      });
      await settle();
    }
    await settle(() => mainActionReady(setup.engine));
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    const choices = [...groups.values()];
    expect(choices).toHaveLength(2);
    expect(choices[0]!.actions.map((action) => action.sourceId)).toEqual(ids);
    expect(choices[1]!.actions.map((action) => action.sourceId)).toEqual(
      ids.filter((_, index) => index < 2 && index !== first),
    );
    for (const choice of choices)
      expect(choice.observation.revealed.map(({ instanceId, cardId }) => ({ instanceId, cardId }))).toEqual(
        ids.map((instanceId, index) => ({ instanceId, cardId: ["BT25-035", "BT25-032", "BT25-057"][index] })),
      );
    expect(JSON.stringify(choices)).not.toContain(unseenId);
    expect(setup.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([ids[first], ids[second]]);
    expect(setup.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      unseenId,
      ...ids.filter((_, index) => index !== first && index !== second),
    ]);
    expect(setup.state.memory).toBe(10 - getCardDefinition("BT25-032")!.playCost);
  });
});
