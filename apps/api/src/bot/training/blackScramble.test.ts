import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Black Scramble through the asynchronous training policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [
        [-1, -1],
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ].map(([hostIndex, evolutionIndex]) => ({
        seat,
        hostIndex: hostIndex!,
        evolutionIndex: evolutionIndex!,
      })),
    ),
  )("seat=$seat selects host $hostIndex and evolution $evolutionIndex", async ({ seat, hostIndex, evolutionIndex }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "EX9-046", as: "host-0" },
          { card: "EX9-046", as: "host-1" },
          { card: "BT25-032", as: "wrong-color" },
          { card: "BT6-090", as: "tamer" },
        ],
        breeding: { card: "EX9-046", as: "breeding", under: ["EX9-005"] },
        hand: [
          { card: "LM-031", as: "option" },
          { card: "EX9-047", as: "evolution-0" },
          { card: "EX9-048", as: "evolution-1" },
          { card: "BT25-035", as: "wrong-evolution" },
        ],
        deck: [{ card: "EX9-046", as: "draw" }],
      },
      [opponent]: { battleArea: [{ card: "EX9-046", as: "opponent" }] },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 5;
    await setup.ready();
    const hosts = [setup.perm("host-0"), setup.perm("host-1")];
    const bases = hosts.map((host) => host.topCard.instanceId);
    const evolutions = [setup.inst("evolution-0").instanceId, setup.inst("evolution-1").instanceId];
    const optionId = setup.inst("option").instanceId;
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      windows.push(window);
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === optionId);
      if (window.kind === "optional") return hostIndex < 0 ? 1 : 0;
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex(
        (action) => action.sourceId === hosts[hostIndex]?.permanentId || action.sourceId === evolutions[evolutionIndex],
      );
    });
    expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
      ok: true,
    });
    for (let step = 0; step < 16; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
      await settle();
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
    const accepted = hostIndex >= 0;
    for (const [index, host] of hosts.entries()) {
      expect(host.topCard.instanceId).toBe(index === hostIndex ? evolutions[evolutionIndex] : bases[index]);
      expect(host.stack.map((card) => card.instanceId)).toEqual(index === hostIndex ? [bases[index]] : []);
    }
    const selections = windows.filter(
      (window) => window.request && window.kind !== "optional" && window.selected.length === 0,
    );
    expect(selections.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
      accepted ? [hosts.map((host) => host.permanentId), evolutions] : [],
    );
    expect(setup.state.memory).toBe(3);
    expect(setup.state.players[seat]!.trash).toHaveLength(0);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      ...hosts.map((host) => host.topCard.instanceId),
      setup.inst("wrong-color").instanceId,
      setup.inst("tamer").instanceId,
      optionId,
    ]);
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
      ...evolutions.filter((_, index) => index !== evolutionIndex),
      setup.inst("wrong-evolution").instanceId,
      ...(accepted ? [setup.inst("draw").instanceId] : []),
    ]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
      accepted ? [] : [setup.inst("draw").instanceId],
    );
    expect(setup.state.players[seat]!.breeding?.topCard.instanceId).toBe(setup.inst("breeding").instanceId);
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("opponent").instanceId,
    ]);
  });
});
