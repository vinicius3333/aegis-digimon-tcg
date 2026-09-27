import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { mainActionReady } from "./actions.js";
import { buildBotView } from "../view.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("e-Pulse start-of-Main destinations through the asynchronous policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => [-1, 0, 1].map((hostIndex) => ({ seat, hostIndex }))))(
    "seat=$seat places under host $hostIndex",
    async ({ seat, hostIndex }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: "ST23-15", as: "option" },
            { card: "ST23-13", as: "host-0", under: [{ card: "BT25-032", as: "old-0", faceUp: false }] },
            { card: "ST23-13", as: "host-1", under: [{ card: "BT25-035", as: "old-1", faceUp: false }] },
            { card: "BT6-090", as: "wrong-tamer" },
            { card: "BT25-032", as: "digimon" },
          ],
          hand: [{ card: "EX9-046", as: "main-play" }],
          deck: [{ card: "EX9-047", as: "draw" }],
        },
        [opponent]: { battleArea: [{ card: "ST23-13", as: "opponent-tamer" }] },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 3;
      await setup.ready();
      setup.state.isFirstPlayersFirstTurn = true;
      const optionId = setup.inst("option").instanceId;
      const hosts = [setup.perm("host-0"), setup.perm("host-1")];
      const originalBoard = setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId);
      const windows: TrainingWindow[] = [];
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.request?.sourceCardId !== "ST23-15") return window.kind === "optional" ? 1 : 0;
        windows.push(window);
        if (window.kind === "optional") return hostIndex < 0 ? 1 : 0;
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        return window.actions.findIndex((action) => action.sourceId === hosts[hostIndex]?.permanentId);
      });
      const turn = setup.engine.runOneTurn();
      for (let step = 0; step < 24; step++) {
        await settle(() => setup.state.pendingDecision !== undefined || setup.engine.mainPhase.isOpen);
        const pending = setup.state.pendingDecision;
        if (!pending) break;
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
        await settle();
      }
      expect(setup.engine.mainPhase.isOpen).toBe(true);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
      expect(
        windows
          .filter((window) => window.kind !== "optional" && window.selected.length === 0)
          .map((window) => window.actions.map((action) => action.sourceId)),
      ).toEqual(hostIndex < 0 ? [] : [hosts.map((host) => host.permanentId)]);
      for (const [index, host] of hosts.entries()) {
        expect(host.stack.map((card) => ({ id: card.instanceId, faceUp: card.faceUp }))).toEqual([
          ...(hostIndex === index ? [{ id: optionId, faceUp: false }] : []),
          { id: setup.inst(`old-${index}`).instanceId, faceUp: false },
        ]);
      }
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
        hostIndex < 0 ? originalBoard : originalBoard.slice(1),
      );
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
        setup.inst("main-play").instanceId,
        ...(hostIndex < 0 ? [] : [setup.inst("draw").instanceId]),
      ]);
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual(
        hostIndex < 0 ? [setup.inst("draw").instanceId] : [],
      );
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("opponent-tamer").instanceId,
      ]);
      expect(setup.state.memory).toBe(hostIndex < 0 ? 3 : 4);
      expect(setup.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
    },
  );
});

describe("e-Pulse Main and security free plays through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((security) => [-1, 0, 1].map((choice) => ({ seat, security, choice }))),
    ),
  )("seat=$seat security=$security chooses $choice", async ({ seat, security, choice }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [{ card: "ST23-13", as: "waiver" }],
        hand: [
          ...(!security ? [{ card: "ST23-15", as: "option" }] : []),
          { card: "ST23-13", as: "hand-target" },
          { card: "EX9-046", as: "wrong-trait" },
          { card: "BT25-057", as: "too-expensive" },
        ],
        trash: [
          { card: "BT26-089", as: "trash-target" },
          { card: "EX9-046", as: "wrong-trash" },
        ],
        security: security ? [{ card: "ST23-15", as: "option" }] : [],
        deck: [{ card: "EX9-047", as: "deck" }],
      },
      [opponent]: { battleArea: [{ card: "EX9-046", as: "attacker" }] },
    });
    const actingSeat = security ? opponent : seat;
    setup.state.turnSeat = actingSeat;
    setup.state.memory = 5;
    await setup.ready();
    const optionId = setup.inst("option").instanceId;
    const targets = [setup.inst("hand-target").instanceId, setup.inst("trash-target").instanceId];
    const windows: TrainingWindow[] = [];
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(({ intent }) => intent.type === "playCard" && intent.instanceId === optionId);
      const declineBlock = window.actions.findIndex(({ intent }) => intent.type === "declineBlock");
      if (declineBlock >= 0) return declineBlock;
      if (window.request?.sourceCardId !== "ST23-15") return window.kind === "optional" ? 1 : 0;
      windows.push(window);
      if (window.kind === "optional") return choice < 0 ? 1 : 0;
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      return window.actions.findIndex((action) => action.sourceId === targets[choice]);
    });
    const attackerPolicy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) => {
      await Promise.resolve();
      return window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player");
    });
    expect(
      setup.engine.applyIntent(
        actingSeat,
        await (security ? attackerPolicy : policy).chooseMainAction(buildBotView(setup.state, actingSeat)!),
      ),
    ).toEqual({ ok: true });
    let answeredBlock = false;
    for (let step = 0; step < 24; step++) {
      await settle();
      const pending = setup.state.pendingDecision;
      if (pending) {
        const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
        expect(request.seat).toBe(seat);
        expect(
          setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
        ).toEqual({ ok: true });
        continue;
      }
      const block = setup.events.find((event) => event.kind === "blockWindowOpened");
      if (block?.kind === "blockWindowOpened" && !answeredBlock) {
        answeredBlock = true;
        expect(
          setup.engine.applyIntent(
            seat,
            await policy.chooseBlockResponse(buildBotView(setup.state, seat)!, {
              ...block,
              mustBlock: block.mustBlock ?? false,
              targetsPlayer: true,
            }),
          ),
        ).toEqual({ ok: true });
        continue;
      }
      if (mainActionReady(setup.engine)) break;
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.engine.combat.isAttacking).toBe(false);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(setup.events.filter((event) => event.kind === "securityRevealed")).toHaveLength(security ? 1 : 0);
    expect(windows.filter((window) => window.kind === "optional")).toHaveLength(1);
    expect(
      windows
        .filter((window) => window.kind !== "optional" && window.selected.length === 0)
        .map((window) => window.actions.map((action) => action.sourceId)),
    ).toEqual(choice < 0 ? [] : [targets]);
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId).sort()).toEqual(
      [setup.inst("waiver").instanceId, optionId, ...(choice < 0 ? [] : [targets[choice]])].sort(),
    );
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([
      ...(choice === 0 ? [] : [targets[0]]),
      setup.inst("wrong-trait").instanceId,
      setup.inst("too-expensive").instanceId,
    ]);
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual([
      ...(choice === 1 ? [] : [targets[1]]),
      setup.inst("wrong-trash").instanceId,
    ]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([setup.inst("deck").instanceId]);
    expect(setup.state.players[seat]!.security).toHaveLength(0);
    expect(setup.state.memory).toBe((security ? 5 : 2) + (choice === 0 ? (security ? -1 : 1) : 0));
    expect(setup.perm("attacker").isSuspended).toBe(security);
  });
});
