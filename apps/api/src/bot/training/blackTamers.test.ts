import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildBotView } from "../view.js";
import { mainActionReady } from "./actions.js";
import { createAsyncTrainingPolicy } from "./policy.js";
import "../../cards/index.js";

async function finish(
  setup: ReturnType<typeof setupEngine>,
  seat: Seat,
  policy: ReturnType<typeof createAsyncTrainingPolicy>,
): Promise<void> {
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
  expect(setup.engine.combat.isAttacking).toBe(false);
  expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
}

describe("BT6-090 deletion reaction through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((opponentTurn) =>
        [false, true].flatMap((black) =>
          [false, true].flatMap((suspended) =>
            [false, true].map((accept) => ({ seat, opponentTurn, black, suspended, accept })),
          ),
        ),
      ),
    ),
  )(
    "seat=$seat opponentTurn=$opponentTurn black=$black suspended=$suspended accept=$accept",
    async ({ seat, opponentTurn, black, suspended, accept }) => {
      const opponent = seat === 0 ? 1 : 0;
      const acting = opponentTurn ? opponent : seat;
      const setup = setupEngine({
        [seat]: {
          battleArea: [
            { card: "BT6-090", as: "tamer", suspended },
            { card: black ? "EX9-046" : "ST23-06", as: "victim", suspended: opponentTurn, dp: 1000 },
          ],
          hand: [{ card: "EX9-048", as: "hand" }],
          deck: [
            { card: "EX9-047", as: "draw" },
            { card: "EX9-054", as: "tail" },
          ],
        },
        [opponent]: { battleArea: [{ card: "EX9-055", as: "wall", dp: 30000, suspended: !opponentTurn }] },
      });
      setup.state.turnSeat = acting;
      setup.state.memory = 5;
      await setup.ready();
      let prompts = 0;
      const defender = setup.perm(opponentTurn ? "victim" : "wall");
      const attacker = setup.perm(opponentTurn ? "wall" : "victim");
      const actor = createAsyncTrainingPolicy(setup.engine, acting, async (window) =>
        window.actions.findIndex(
          ({ intent }) =>
            intent.type === "attack" &&
            intent.attackerPermanentId === attacker.permanentId &&
            intent.target.kind === "permanent" &&
            intent.target.permanentId === defender.permanentId,
        ),
      );
      const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
        await Promise.resolve();
        expect(window.kind).toBe("optional");
        expect(window.request?.sourceCardId).toBe("BT6-090");
        prompts++;
        return accept ? 0 : 1;
      });
      expect(
        setup.engine.applyIntent(acting, await actor.chooseMainAction(buildBotView(setup.state, acting)!)),
      ).toEqual({ ok: true });
      await finish(setup, seat, policy);
      const eligible = opponentTurn && black && !suspended;
      const paid = eligible && accept;
      expect(prompts).toBe(eligible ? 1 : 0);
      expect(setup.perm("tamer").isSuspended).toBe(suspended || paid);
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
        setup.inst("hand").instanceId,
        ...(paid ? [setup.inst("draw").instanceId] : []),
      ]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
        (paid ? ["tail"] : ["draw", "tail"]).map((alias) => setup.inst(alias).instanceId),
      );
      expect(setup.state.players[seat]!.trash.map((item) => item.instanceId)).toEqual([
        setup.inst("victim").instanceId,
      ]);
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("tamer").instanceId,
      ]);
      expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("wall").instanceId,
      ]);
      expect(setup.state.memory).toBe(5);
    },
  );
});

const starts = [
  ...[0, 1, 2].map((count) => ({ card: "BT6-090", count, memory: 1, expected: count >= 2 ? 3 : 1 })),
  ...[0, 2, 3, 5].map((memory) => ({ card: "ST15-14", count: 0, memory, expected: Math.max(3, memory) })),
];
describe("black-deck Tamer automatic entries", () => {
  it.each(([0, 1] as const).flatMap((seat) => starts.map((entry) => ({ seat, ...entry }))))(
    "seat=$seat start=$card count=$count memory=$memory",
    async ({ seat, card, count, memory, expected }) => {
      const setup = setupEngine({
        [seat]: {
          battleArea: [{ card, as: "tamer" }],
          hand: [{ card: "EX9-046", as: "hand" }],
          deck: [{ card: "EX9-047", as: "deck" }],
        },
        [1 - seat]: { battleArea: Array.from({ length: count }, () => ({ card: "EX9-046" })) },
      });
      setup.state.turnSeat = seat;
      setup.state.memory = memory;
      await setup.ready();
      setup.state.isFirstPlayersFirstTurn = true;
      const turn = setup.engine.runOneTurn();
      await settle(() => mainActionReady(setup.engine));
      expect(setup.state.memory).toBe(expected);
      expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([setup.inst("hand").instanceId]);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([setup.inst("deck").instanceId]);
      expect(setup.state.pendingDecision).toBeUndefined();
      expect(setup.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await turn;
    },
  );
  it.each(([0, 1] as const).flatMap((seat) => ["BT6-090", "ST15-14"].map((card) => ({ seat, card }))))(
    "seat=$seat security=$card",
    async ({ seat, card }) => {
      const opponent = seat === 0 ? 1 : 0;
      const setup = setupEngine({
        [seat]: { security: [{ card, as: "tamer" }], deck: [{ card: "EX9-047", as: "deck" }] },
        [opponent]: { battleArea: [{ card: "EX9-055", as: "attacker" }] },
      });
      setup.state.turnSeat = opponent;
      setup.state.memory = 5;
      await setup.ready();
      const policy = createAsyncTrainingPolicy(setup.engine, opponent, async (window) =>
        window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player"),
      );
      expect(
        setup.engine.applyIntent(opponent, await policy.chooseMainAction(buildBotView(setup.state, opponent)!)),
      ).toEqual({ ok: true });
      await finish(setup, opponent, policy);
      expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
        setup.inst("tamer").instanceId,
      ]);
      expect(setup.perm("tamer").isSuspended).toBe(false);
      expect(setup.state.players[seat]!.security).toHaveLength(0);
      expect(setup.state.players[seat]!.trash).toHaveLength(0);
      expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual([setup.inst("deck").instanceId]);
      expect(setup.state.memory).toBe(5);
    },
  );
});

describe("ST15-14 reaction to Negamon redirection through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      [false, true].flatMap((suspended) => [-1, 0, 1].map((target) => ({ seat, suspended, target }))),
    ),
  )("seat=$seat suspended=$suspended target=$target", async ({ seat, suspended, target }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "ST15-14", as: "tamer", suspended },
          { card: "EX9-047", as: "target-0", dp: 1000, under: [{ card: "EX9-005", as: "egg" }] },
          { card: "EX9-048", as: "target-1", dp: 30000 },
        ],
        hand: [{ card: "EX9-046", as: "hand" }],
        deck: [
          { card: "EX9-047", as: "draw" },
          { card: "EX9-048", as: "tail" },
        ],
        security: [{ card: "EX9-046", as: "security" }],
      },
      [opponent]: { battleArea: [{ card: "EX9-055", as: "attacker", dp: 2000 }] },
    });
    setup.state.turnSeat = opponent;
    setup.state.memory = 5;
    await setup.ready();
    const targets = [0, 1].map((index) => setup.perm(`target-${index}`));
    let reactions = 0;
    let boosts = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "optional") {
        if (window.request?.sourceCardId === "EX9-005") return 0;
        if (window.request?.sourceCardId === "EX9-047") return 1;
        expect(window.request?.sourceCardId).toBe("ST15-14");
        reactions++;
        return target < 0 ? 1 : 0;
      }
      if (window.selected.length) return window.actions.findIndex((action) => action.label === "Finish selection");
      expect(window.actions.map((action) => action.sourceId)).toEqual(targets.map((unit) => unit.permanentId));
      const reaction = window.request?.sourceCardId === "ST15-14";
      if (reaction) boosts++;
      return window.actions.findIndex((action) => action.sourceId === targets[reaction ? target : 0]!.permanentId);
    });
    const attacker = createAsyncTrainingPolicy(setup.engine, opponent, async (window) =>
      window.actions.findIndex(({ intent }) => intent.type === "attack" && intent.target.kind === "player"),
    );
    expect(
      setup.engine.applyIntent(opponent, await attacker.chooseMainAction(buildBotView(setup.state, opponent)!)),
    ).toEqual({ ok: true });
    await finish(setup, seat, policy);
    const paid = !suspended && target >= 0;
    const won = paid && target === 0;
    expect(reactions).toBe(suspended ? 0 : 1);
    expect(boosts).toBe(paid ? 1 : 0);
    expect(setup.perm("tamer").isSuspended).toBe(suspended || paid);
    for (const [index, unit] of targets.entries())
      expect(unit.currentDP).toBe((index === 0 ? 1000 : 30000) + (paid && index === target ? 2000 : 0));
    expect(
      setup.events.flatMap((event) => (event.kind === "attackDeclared" && event.redirected ? [event.target] : [])),
    ).toEqual([{ kind: "permanent", permanentId: targets[0]!.permanentId }]);
    expect(setup.state.players[seat]!.hand.map((item) => item.instanceId)).toEqual([
      setup.inst("hand").instanceId,
      ...(paid ? [setup.inst("draw").instanceId] : []),
    ]);
    expect(setup.state.players[seat]!.deck.map((item) => item.instanceId)).toEqual(
      (paid ? ["tail"] : ["draw", "tail"]).map((alias) => setup.inst(alias).instanceId),
    );
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId).sort()).toEqual(
      won ? [] : [setup.inst("target-0").instanceId, setup.inst("egg").instanceId].sort(),
    );
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("tamer").instanceId,
      ...(won ? [setup.inst("target-0").instanceId] : []),
      setup.inst("target-1").instanceId,
    ]);
    expect(setup.state.players[opponent]!.trash.map((item) => item.instanceId)).toEqual(
      won ? [setup.inst("attacker").instanceId] : [],
    );
    expect(setup.state.players[seat]!.security.map((item) => item.instanceId)).toEqual([
      setup.inst("security").instanceId,
    ]);
    expect(setup.state.memory).toBe(5);
    expect(setup.events.filter((event) => event.kind === "securityChecked")).toEqual([]);
  });
});

describe("EX1-066 deletion payment and breeding result through the asynchronous policy", () => {
  it.each(
    ([0, 1] as const).flatMap((seat) =>
      ["empty", "occupied", "noEgg"].flatMap((breeding) => [false, true].map((accept) => ({ seat, breeding, accept }))),
    ),
  )("seat=$seat breeding=$breeding accept=$accept", async ({ seat, breeding, accept }) => {
    const opponent = seat === 0 ? 1 : 0;
    const setup = setupEngine({
      [seat]: {
        battleArea: [
          { card: "EX1-066", as: "tamer" },
          { card: "EX1-061", as: "victim", dp: 1000, under: [{ card: "EX1-056", as: "source" }] },
        ],
        ...(breeding === "occupied" ? { breeding: { card: "EX9-005", as: "occupied" } } : {}),
        eggDeck: breeding === "noEgg" ? [] : [{ card: "EX9-005", as: "egg" }],
      },
      [opponent]: { battleArea: [{ card: "BT1-009", as: "wall", suspended: true, dp: 8000 }] },
    });
    setup.state.turnSeat = seat;
    setup.state.memory = 5;
    await setup.ready();
    let prompts = 0;
    const policy = createAsyncTrainingPolicy(setup.engine, seat, async (window) => {
      await Promise.resolve();
      if (window.kind === "main")
        return window.actions.findIndex(
          ({ intent }) =>
            intent.type === "attack" &&
            intent.attackerPermanentId === setup.perm("victim").permanentId &&
            intent.target.kind === "permanent" &&
            intent.target.permanentId === setup.perm("wall").permanentId,
        );
      expect(window.kind).toBe("optional");
      if (window.request?.sourceCardId !== "EX1-066") return 1;
      prompts++;
      return accept ? 0 : 1;
    });
    expect(setup.engine.applyIntent(seat, await policy.chooseMainAction(buildBotView(setup.state, seat)!))).toEqual({
      ok: true,
    });
    await finish(setup, seat, policy);
    expect(prompts).toBe(1);
    expect(setup.perm("tamer").isSuspended).toBe(accept);
    expect(setup.state.memory).toBe(5 + Number(accept));
    expect(setup.state.players[seat]!.trash.map((item) => item.instanceId).sort()).toEqual(
      [setup.inst("victim").instanceId, setup.inst("source").instanceId].sort(),
    );
    expect(setup.state.players[seat]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("tamer").instanceId,
    ]);
    expect(setup.state.players[seat]!.breeding?.topCard.instanceId).toBe(
      breeding === "occupied"
        ? setup.inst("occupied").instanceId
        : accept && breeding === "empty"
          ? setup.inst("egg").instanceId
          : undefined,
    );
    expect(setup.state.players[seat]!.eggDeck.map((item) => item.instanceId)).toEqual(
      breeding !== "noEgg" && !(accept && breeding === "empty") ? [setup.inst("egg").instanceId] : [],
    );
    expect(setup.state.players[opponent]!.battleArea.map((unit) => unit.topCard.instanceId)).toEqual([
      setup.inst("wall").instanceId,
    ]);
  });
});
