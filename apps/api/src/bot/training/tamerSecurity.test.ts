import { describe, expect, it } from "vitest";
import { getCardDefinition, type Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy } from "./policy.js";
import "../../cards/index.js";

async function finish(
  setup: ReturnType<typeof setupEngine>,
  seat: Seat,
  policy: ReturnType<typeof createAsyncTrainingPolicy>,
): Promise<void> {
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
  expect(setup.state.pendingDecision).toBeUndefined();
  expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
}

describe("BT26-089 start-of-Main payment through the asynchronous policy", () => {
  it.each(([0, 1] as const).flatMap((seat) => [-1, 0, 1].map((choice) => ({ seat, choice }))))(
    "seat=$seat choice=$choice",
    async ({ seat, choice }) => {
      const setup = setupEngine({
        [seat]: {
          battleArea: [{ card: "BT26-089", as: "tamer", under: [{ card: "EX9-046", as: "old", faceUp: false }] }],
          hand: [
            { card: "BT25-032", as: "cost-0" },
            { card: "ST23-12", as: "cost-1" },
            { card: "EX9-046", as: "other" },
          ],
          deck: [
            { card: "EX9-047", as: "draw" },
            { card: "EX9-048", as: "tail" },
          ],
        },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = 3;
      await setup.ready();
      setup.state.isFirstPlayersFirstTurn = true;
      const costs = [0, 1].map((index) => setup.inst(`cost-${index}`).instanceId);
      let choices = 0;
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        if (window.kind === "optional") return choice < 0 ? 1 : 0;
        if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
        choices++;
        expect(window.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]))).toEqual(
          costs,
        );
        return window.actions.findIndex((action) =>
          choice < 0 ? action.label === "Finish selection" : action.sourceId === costs[choice],
        );
      });
      const turn = setup.engine.runOneTurn();
      await finish(setup, seat, policy);
      expect(choices).toBe(choice < 0 ? 0 : 1);
      expect(setup.perm("tamer").stack.map((item) => ({ id: item.instanceId, faceUp: item.faceUp }))).toEqual([
        ...(choice < 0 ? [] : [{ id: costs[choice], faceUp: false }]),
        { id: setup.inst("old").instanceId, faceUp: false },
      ]);
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        ...costs.filter((_, index) => index !== choice),
        setup.inst("other").instanceId,
        ...(choice < 0 ? [] : [setup.inst("draw").instanceId]),
      ]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
        (choice < 0 ? ["draw", "tail"] : ["tail"]).map((alias) => setup.inst(alias).instanceId),
      );
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.memory).toBe(choice < 0 ? 3 : 4);
      expect(setup.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
    },
  );
});

describe("BT26-089 security events through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      (["effect", "check", "security"] as const).flatMap((entry) =>
        (entry === "security" ? [false] : [false, true]).flatMap((suspended) =>
          (entry === "effect" ? [-1, 0, 1] : [-1, 0]).map((target) => ({ seat, entry, suspended, target })),
        ),
      ),
    ),
  )("seat=$seat entry=$entry suspended=$suspended target=$target", async ({ seat, entry, suspended, target }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea:
          entry === "security"
            ? []
            : [{ card: "BT26-089", as: "tamer", suspended, under: [{ card: "BT25-032", as: "old", faceUp: false }] }],
        hand: entry === "effect" ? [{ card: "BT26-031", as: "option" }] : [],
        security: [
          { card: entry === "security" ? "BT26-089" : "EX9-047", as: entry === "security" ? "tamer" : "security" },
        ],
        deck: [
          { card: "EX9-046", as: "top" },
          { card: "EX9-048", as: "tail" },
        ],
      },
      [opponent]: { battleArea: [0, 1].map((index) => ({ card: "EX9-055", as: `opponent-${index}`, dp: 30000 })) },
    });
    const actingSeat = entry === "effect" ? seat : opponent;
    setup.state.turnSeat = actingSeat;
    setup.state.memory = 10;
    await setup.ready();
    const targets = [0, 1].map((index) => setup.perm(`opponent-${index}`));
    let reactions = 0;
    let debuffs = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) => intent.type === "playCard" && intent.instanceId === setup.inst("option").instanceId,
        );
      if (window.kind === "optional") {
        if (window.request?.sourceCardId === "BT26-089") {
          reactions++;
          return target < 0 ? 1 : 0;
        }
        expect(window.request?.sourceCardId).toBe("BT26-031");
        return 0;
      }
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      expect(window.actions.flatMap((action) => (action.sourceId === undefined ? [] : [action.sourceId]))).toEqual(
        targets.map((unit) => unit.permanentId),
      );
      const reaction = window.request?.sourceCardId === "BT26-089";
      if (reaction) debuffs++;
      return window.actions.findIndex((action) => action.sourceId === targets[reaction ? target : 0]!.permanentId);
    });
    if (entry === "effect")
      expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
        ok: true,
      });
    else {
      const attacker = createAsyncTrainingPolicy(setup.engine, opponent, async (window) =>
        window.actions.findIndex(
          ({ intent }) =>
            intent.type === "attack" &&
            intent.attackerPermanentId === targets[0]!.permanentId &&
            intent.target.kind === "player",
        ),
      );
      expect(
        setup.engine.applyIntent(opponent, await attacker.chooseMainAction(buildBotView(setup.state, opponent)!)),
      ).toEqual({ ok: true });
    }
    await finish(setup, seat, policy);
    const accepted = entry !== "security" && !suspended && target >= 0;
    expect(reactions).toBe(entry === "security" || suspended ? 0 : 1);
    expect(debuffs).toBe(entry === "effect" && accepted ? 1 : 0);
    const tamer = setup.perm("tamer");
    expect(tamer.isSuspended).toBe(suspended || accepted);
    expect(tamer.stack.map((item) => ({ id: item.instanceId, faceUp: item.faceUp }))).toEqual([
      ...(accepted ? [{ id: setup.inst("top").instanceId, faceUp: false }] : []),
      ...(entry === "security" ? [] : [{ id: setup.inst("old").instanceId, faceUp: false }]),
    ]);
    expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
      (accepted ? ["tail"] : ["top", "tail"]).map((alias) => setup.inst(alias).instanceId),
    );
    expect(setup.state.players[seat]!.security).toHaveLength(0);
    expect(setup.state.players[seat]!.hand).toHaveLength(0);
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual(
      entry === "security"
        ? []
        : [setup.inst("security").instanceId, ...(entry === "effect" ? [setup.inst("option").instanceId] : [])],
    );
    for (const [index, unit] of targets.entries()) {
      expect(observe(setup.engine).keywordAmount(unit, "SecurityAttack")).toBe(
        entry === "effect" && accepted && target === index ? -1 : 0,
      );
      expect(unit.currentDP).toBe(entry === "effect" && index === 0 ? 17000 : 30000);
    }
    expect(setup.state.memory).toBe(entry === "effect" ? 10 - getCardDefinition("BT26-031")!.playCost : 10);
    expect(setup.engine.combat.isAttacking).toBe(false);
  });
});
