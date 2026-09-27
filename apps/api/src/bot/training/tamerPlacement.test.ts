import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy } from "./policy.js";
import "../../cards/index.js";

describe("ST23-13 entry and start-of-Main placement through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      (["play", "start", "security"] as const).flatMap((entry) =>
        (entry === "security" ? [true] : [false, true]).flatMap((opponentDigimon) =>
          [false, true].flatMap((accept) =>
            [false, true].map((hasDeck) => ({ seat, entry, opponentDigimon, accept, hasDeck })),
          ),
        ),
      ),
    ),
  )(
    "seat=$seat entry=$entry opponent=$opponentDigimon accept=$accept deck=$hasDeck",
    async ({ seat, entry, opponentDigimon, accept, hasDeck }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: {
          battleArea:
            entry === "start"
              ? [{ card: "ST23-13", as: "tamer", under: [{ card: "BT25-032", as: "old", faceUp: false }] }]
              : [],
          hand: [...(entry === "play" ? [{ card: "ST23-13", as: "tamer" }] : []), { card: "EX9-046", as: "hand" }],
          security: entry === "security" ? [{ card: "ST23-13", as: "tamer" }] : [],
          deck: hasDeck
            ? [
                { card: "EX9-047", as: "top" },
                { card: "EX9-048", as: "tail" },
              ]
            : [],
        },
        [opponent]: {
          battleArea: opponentDigimon
            ? [{ card: "EX9-046", as: "attacker" }]
            : [{ card: "BT6-090", as: "opponent-tamer" }],
        },
      });
      setup.state.turnSeat = entry === "security" ? opponent : seat;
      setup.state.memory = entry === "start" ? 3 : entry === "security" ? 5 : 10;
      await setup.ready();
      setup.state.isFirstPlayersFirstTurn = true;
      let prompts = 0;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "main")
          return window.actions.findIndex(
            ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("tamer").instanceId,
          );
        expect(window.kind).toBe("optional");
        expect(window.request?.sourceCardId).toBe("ST23-13");
        prompts++;
        return accept ? 0 : 1;
      });
      let turn: Promise<void> | undefined;
      if (entry === "start") turn = setup.engine.runOneTurn();
      else if (entry === "play")
        expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual(
          { ok: true },
        );
      else {
        const attacker = createAsyncTrainingPolicy(setup.engine, opponent, async (window) =>
          window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player"),
        );
        expect(
          setup.engine.applyIntent(opponent, await attacker.chooseMainAction(buildBotView(setup.state, opponent)!)),
        ).toEqual({ ok: true });
      }
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
      const tamer = setup.perm("tamer");
      const placed = accept && hasDeck;
      expect(tamer.stack.map((item) => ({ id: item.instanceId, faceUp: item.faceUp }))).toEqual([
        ...(placed ? [{ id: setup.inst("top").instanceId, faceUp: false }] : []),
        ...(entry === "start" ? [{ id: setup.inst("old").instanceId, faceUp: false }] : []),
      ]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
        hasDeck ? (placed ? ["tail"] : ["top", "tail"]).map((alias) => setup.inst(alias).instanceId) : [],
      );
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([setup.inst("hand").instanceId]);
      expect(setup.state.players[seat]!.security).toHaveLength(0);
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(tamer.isSuspended).toBe(false);
      expect(setup.state.memory).toBe(
        entry === "security"
          ? 4
          : (entry === "start" ? 3 : 10 - getCardDefinition("ST23-13")!.playCost) + Number(opponentDigimon),
      );
      expect(prompts).toBe(hasDeck ? 1 : 0);
      expect(setup.engine.combat.isAttacking).toBe(false);
      expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
      if (turn !== undefined) {
        expect(setup.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await turn;
      }
    },
  );
});

describe("ST23-13 paid-source reaction through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [0, 1].flatMap((payer) => [-1, 0, 1].map((target) => ({ seat, payer, target }))),
    ),
  )("seat=$seat payer=$payer target=$target", async ({ seat, payer, target }) => {
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "BT25-049", as: "glowing-0" },
          { card: "ST23-04", as: "glowing-1" },
          { card: "EX9-046", as: "wrong-trait" },
          ...[0, 1].map((index) => ({
            card: "ST23-13",
            as: `tamer-${index}`,
            under: [
              { card: "ST23-06", as: `visible-${index}`, faceUp: true },
              { card: "BT25-032", as: `bottom-${index}`, faceUp: false },
              { card: "BT26-025", as: `next-${index}`, faceUp: false },
            ],
          })),
        ],
        hand: [{ card: "BT26-031", as: "option" }],
        deck: [{ card: "EX9-047", as: "deck" }],
      },
      [1 - seat]: { battleArea: [{ card: "EX9-055", as: "opponent", dp: 30000 }] },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 10;
    await setup.ready();
    const tamerIds = [0, 1].map((index) => setup.inst(`tamer-${index}`).instanceId);
    const targetIds = [0, 1].map((index) => setup.perm(`glowing-${index}`).permanentId);
    let reactions = 0;
    let reactionTargets = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("option").instanceId,
        );
      if (window.kind === "optional") {
        if (window.request?.sourceCardId === "BT25-049") return 0;
        if (window.request?.sourceCardId === "ST23-13") {
          reactions++;
          return target < 0 ? 1 : 0;
        }
        return 1;
      }
      if (window.selected.length || window.request?.promptText.startsWith("＜Arts Digivolve＞"))
        return window.actions.findIndex((action) => action.label === "Finish selection");
      const ids = window.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]));
      if (ids.some((id) => tamerIds.includes(id))) {
        expect(ids).toEqual(tamerIds);
        return window.actions.findIndex((action) => action.sourceId === tamerIds[payer]);
      }
      if (ids.some((id) => targetIds.includes(id))) {
        expect(ids).toEqual(targetIds);
        reactionTargets++;
        return window.actions.findIndex((action) => action.sourceId === targetIds[target]);
      }
      expect(ids).toEqual([setup.perm("opponent").permanentId]);
      return 0;
    });
    expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
      ok: true,
    });
    for (let step = 0; step < 24; step++) {
      await settle(() => setup.state.pendingDecision !== undefined || mainActionReady(setup.engine));
      const pending = setup.state.pendingDecision;
      if (!pending) break;
      const request = setup.decisions.findLast(({ req }) => req.decisionId === pending.decisionId)!.req;
      expect(
        setup.engine.applyIntent(seat, await policy.answerDecision(buildBotView(setup.state, seat), request)),
      ).toEqual({ ok: true });
    }
    expect(mainActionReady(setup.engine)).toBe(true);
    expect(setup.state.pendingDecision).toBeUndefined();
    expect(reactions).toBe(1);
    expect(reactionTargets).toBe(target < 0 ? 0 : 1);
    for (const index of [0, 1]) {
      const tamer = setup.perm(`tamer-${index}`);
      expect(tamer.isSuspended).toBe(index === payer && target >= 0);
      expect(tamer.stack.map((item) => item.instanceId)).toEqual(
        [`visible-${index}`, ...(index === payer ? [] : [`bottom-${index}`]), `next-${index}`].map(
          (alias) => setup.inst(alias).instanceId,
        ),
      );
      const glowing = setup.perm(`glowing-${index}`);
      expect(glowing.currentDP).toBe(getCardDefinition(glowing.topCard.cardId)!.dp! + (index === target ? 3000 : 0));
    }
    expect(setup.perm("wrong-trait").currentDP).toBe(getCardDefinition("EX9-046")!.dp);
    expect(setup.perm("opponent").currentDP).toBe(22000);
    expect(setup.state.memory).toBe(10 - Math.max(0, getCardDefinition("BT26-031")!.playCost - 3));
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual([
      setup.inst(`bottom-${payer}`).instanceId,
      setup.inst("option").instanceId,
    ]);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([setup.inst("deck").instanceId]);
    expect(setup.state.players[seat]!.security).toHaveLength(0);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });
});
