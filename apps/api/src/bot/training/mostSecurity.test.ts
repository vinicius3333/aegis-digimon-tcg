import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy, type TrainingWindow } from "./policy.js";
import "../../cards/index.js";

describe("Habakirimon largest-security choices through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["digivolve", "attack"].flatMap((entry) =>
        [1, 2, 3].flatMap((opponentCount) =>
          ["decline", ...(opponentCount <= 2 ? ["mine"] : []), ...(opponentCount >= 2 ? ["opponent"] : [])].map(
            (choice) => ({ seat, entry, opponentCount, choice }),
          ),
        ),
      ),
    ),
  )(
    "seat=$seat entry=$entry opposing-security=$opponentCount choice=$choice",
    async ({ seat, entry, opponentCount, choice }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: entry === "digivolve" ? "BT25-041" : "BT25-043", as: "base", suspended: entry === "digivolve" },
          ],
          hand: entry === "digivolve" ? [{ card: "BT25-043", as: "evolution" }] : [],
          security: [{ card: "BT25-032", as: "own-security" }],
          deck: [
            ...(entry === "digivolve" ? [{ card: "BT25-049", as: "draw" }] : []),
            { card: "ST23-04", as: "recovery" },
            { card: "BT26-025", as: "tail" },
          ],
        },
        [opponent]: {
          battleArea: [{ card: "EX9-048", as: "defender", dp: 1000, suspended: true }],
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
          return window.actions.findIndex(({ intent }) =>
            entry === "attack"
              ? intent.type === "attack" &&
                intent.attackerPermanentId === setup.perm("base").permanentId &&
                intent.target.kind === "permanent" &&
                intent.target.permanentId === setup.perm("defender").permanentId
              : intent.type === "digivolve" &&
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
      expect(
        setup.events
          .filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT25-043")
          .map((event) => (event.kind === "effectTriggered" ? event.timing : undefined)),
      ).toContain(entry === "attack" ? "OnUseAttack" : "WhenDigivolving");
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.perm("base").topCard.instanceId).toBe(
        setup.inst(entry === "attack" ? "base" : "evolution").instanceId,
      );
      expect(setup.perm("base").stack.map((card) => card.instanceId)).toEqual(
        entry === "attack" ? [] : [setup.inst("base").instanceId],
      );
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
      expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual([
        ...(choice === "opponent" ? [opposingSecurity[0]] : []),
        ...(entry === "attack" ? [setup.inst("defender").instanceId] : []),
      ]);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual(
        entry === "attack" ? [] : [setup.inst("defender").instanceId],
      );
      expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual(
        entry === "attack" ? [] : [setup.inst("draw").instanceId],
      );
      expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([setup.inst("tail").instanceId]);
      expect(setup.state.memory).toBe(entry === "attack" ? 10 : 7);
      expect(setup.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(entry === "attack" ? 1 : 0);
      expect(setup.events.filter((event) => event.kind === "securityRevealed")).toEqual([]);
    },
  );
});

describe("Murasamemon largest-security follow-on targets through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) => [
      { seat, choice: "decline", targetIndex: -1 },
      ...["mine", "opponent"].flatMap((choice) => [0, 1].map((targetIndex) => ({ seat, choice, targetIndex }))),
    ]),
  )("seat=$seat choice=$choice target=$targetIndex", async ({ seat, choice, targetIndex }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "BT26-026", as: "base" },
          { card: "EX9-046", as: "friendly" },
        ],
        hand: [{ card: "BT26-031", as: "evolution" }],
        security: [{ card: "BT25-032", as: "own-security" }],
        deck: [
          { card: "ST23-04", as: "draw" },
          { card: "BT25-035", as: "tail" },
        ],
      },
      [opponent]: {
        battleArea: [
          { card: "EX9-046", as: "digimon-target" },
          { card: "BT6-090", as: "tamer-target" },
        ],
        breeding: { card: "EX9-048", as: "breeding", under: ["EX9-005"] },
        security: [{ card: "EX9-047", as: "opponent-security" }],
      },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const targets = [setup.perm("digimon-target"), setup.perm("tamer-target")];
    const securityWindows: TrainingWindow[] = [];
    const targetWindows: TrainingWindow[] = [];
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
      if (window.actions.some((action) => action.sourceId === "mine")) {
        securityWindows.push(window);
        return window.actions.findIndex((action) =>
          choice === "decline" ? action.label === "Finish selection" : action.sourceId === choice,
        );
      }
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      if (window.actions.some((action) => action.sourceId === targets[0]!.permanentId)) {
        targetWindows.push(window);
        return window.actions.findIndex((action) => action.sourceId === targets[targetIndex]?.permanentId);
      }
      return window.kind === "optional" ? 1 : 0;
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
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(securityWindows.map((window) => window.actions.map((action) => action.sourceId))).toEqual([
      ["mine", "opponent", undefined],
    ]);
    expect(targetWindows.map((window) => window.actions.map((action) => action.sourceId))).toEqual(
      choice === "decline" ? [] : [targets.map((unit) => unit.permanentId)],
    );
    for (const [index, target] of targets.entries()) {
      expect(target.cannotSuspend).toBe(index === targetIndex);
      expect(setup.engine.continuous.hasRestriction(target.permanentId, "beSuspended")).toBe(index === targetIndex);
      expect(target.isSuspended).toBe(false);
    }
    expect(setup.perm("friendly").cannotSuspend).toBe(false);
    expect(setup.perm("breeding").cannotSuspend).toBe(false);
    expect(setup.state.players[seat]!.security.map((card) => card.instanceId)).toEqual(
      choice === "mine" ? [] : [setup.inst("own-security").instanceId],
    );
    expect(setup.state.players[opponent]!.security.map((card) => card.instanceId)).toEqual(
      choice === "opponent" ? [] : [setup.inst("opponent-security").instanceId],
    );
    expect(setup.state.players[seat]!.trash.map((card) => card.instanceId)).toEqual(
      choice === "mine" ? [setup.inst("own-security").instanceId] : [],
    );
    expect(setup.state.players[opponent]!.trash.map((card) => card.instanceId)).toEqual(
      choice === "opponent" ? [setup.inst("opponent-security").instanceId] : [],
    );
    expect(setup.perm("base").topCard.instanceId).toBe(setup.inst("evolution").instanceId);
    expect(setup.perm("base").stack.map((card) => card.instanceId)).toEqual([setup.inst("base").instanceId]);
    expect(setup.state.players[seat]!.hand.map((card) => card.instanceId)).toEqual([setup.inst("draw").instanceId]);
    expect(setup.state.players[seat]!.deck.map((card) => card.instanceId)).toEqual([setup.inst("tail").instanceId]);
    expect(setup.state.memory).toBe(7);
  });
});
