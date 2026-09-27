import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Black Scramble through the asynchronous training policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((paidRemainder) =>
        [
          [-1, -1],
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ].map(([hostIndex, evolutionIndex]) => ({
          seat,
          paidRemainder,
          hostIndex: hostIndex!,
          evolutionIndex: evolutionIndex!,
        })),
      ),
    ),
  )(
    "seat=$seat selects host $hostIndex and evolution $evolutionIndex (paid remainder=$paidRemainder)",
    async ({ seat, hostIndex, evolutionIndex, paidRemainder }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: paidRemainder ? "BT25-076" : "EX9-046", as: "host-0" },
            { card: paidRemainder ? "BT25-076" : "EX9-046", as: "host-1" },
            { card: paidRemainder ? "EX8-074" : "BT25-032", as: "wrong-color" },
            { card: "BT6-090", as: "tamer" },
          ],
          breeding: { card: "EX9-046", as: "breeding", under: ["EX9-005"] },
          hand: [
            { card: "LM-031", as: "option" },
            { card: paidRemainder ? "BT9-112" : "EX9-047", as: "evolution-0" },
            { card: paidRemainder ? "BT9-112" : "EX9-048", as: "evolution-1" },
            { card: "BT25-035", as: "wrong-evolution" },
          ],
          deck: [{ card: "EX9-046", as: "draw" }],
        },
        [opponent]: { battleArea: [{ card: paidRemainder ? "EX9-055" : "EX9-046", as: "opponent" }] },
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
          (action) =>
            action.sourceId === hosts[hostIndex]?.permanentId || action.sourceId === evolutions[evolutionIndex],
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
      expect(setup.state.memory).toBe(accepted && paidRemainder ? 0 : 3);
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
    },
  );
});

describe("Black Scramble start-of-turn recovery through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) => [
      { seat, recover: -1, revive: -1 },
      ...[0, 1, 2].flatMap((recover) =>
        [-1, 1, 2].filter((revive) => revive !== recover).map((revive) => ({ seat, recover, revive })),
      ),
    ]),
  )("seat=$seat recovers $recover and revives $revive", async ({ seat, recover, revive }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [{ card: "LM-031", as: "option" }],
        hand: [{ card: "EX9-046", as: "main-play" }],
        trash: [
          { card: "EX9-047", as: "recover-0" },
          { card: "EX9-046", as: "recover-1" },
          { card: "EX9-046", as: "recover-2" },
          { card: "BT25-032", as: "wrong-color" },
          { card: "BT6-090", as: "tamer" },
        ],
      },
      [opponent]: { battleArea: [{ card: "EX9-046", as: "opponent" }] },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 3;
    await setup.ready();
    setup.state.isFirstPlayersFirstTurn = true;
    setup.perm("option").placedByEffect = true;
    const ids = [0, 1, 2].map((index) => setup.inst(`recover-${index}`).instanceId);
    const optionId = setup.inst("option").instanceId;
    const windows: TrainingWindow[] = [];
    let optionalCount = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      windows.push(window);
      if (window.request?.sourceCardId === "EX9-046") {
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return 0;
      }
      if (window.kind === "optional") {
        optionalCount += 1;
        return (optionalCount === 1 ? recover : revive) < 0 ? 1 : 0;
      }
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      const target = optionalCount === 1 ? ids[recover] : ids[revive];
      return window.actions.findIndex((action) => action.sourceId === target);
    });
    const mainPhase = setup.engine.mainPhase;
    const turn = setup.engine.runOneTurn();
    for (let step = 0; step < 20; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainPhase.isOpen);
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(request.seat).toBe(seat);
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
      await settle();
    }
    expect(mainPhase.isOpen).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(optionalCount).toBe(recover < 0 ? 1 : 2);
    const choices = windows.filter(
      (window) =>
        window.request?.sourceCardId === "LM-031" && window.kind !== "optional" && window.selected.length === 0,
    );
    expect(choices.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
      recover < 0 ? [] : [ids, ...(revive >= 0 && recover === 0 ? [ids.slice(1)] : [])],
    );
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
      recover >= 0 && revive < 0 ? [ids[recover]] : [],
    );
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
      setup.inst("main-play").instanceId,
      ...(revive >= 0 ? [ids[recover]] : []),
    ]);
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("opponent").instanceId,
    ]);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
      recover < 0 ? [optionId] : revive < 0 ? [] : [ids[revive]],
    );
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [
        ...ids.filter((_, index) => index !== recover && index !== revive),
        setup.inst("wrong-color").instanceId,
        setup.inst("tamer").instanceId,
        ...(recover >= 0 ? [optionId] : []),
      ].sort(),
    );
    expect(setup.state.memory).toBe(3);
    expect(setup.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });
});
