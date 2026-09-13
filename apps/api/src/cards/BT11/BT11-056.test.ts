import { observe } from "../../engine/testkit/observe.js";
import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-056.js";

describe("BT11-056 Jijimon", () => {
  it("maps the green mega and both reveal/play clauses", () => {
    expect(getCardDefinition("BT11-056")).toMatchObject({
      cardId: "BT11-056",
      colors: ["Green"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Ancient"],
    });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckTopOrBottom",
          add: [{ filter: { controllerDefault: "mine", kind: ["Tamer"] } }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "RevealAdd", add: [{ totalPlayCostBudget: 10 }] }],
    });
    expect(compiled.effects[0]?.actions[0]).not.toHaveProperty("add.0.filter.colors");
  });

  it("reveals 3 and plays a revealed Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-055", as: "base" }],
          hand: [{ card: "BT11-056", as: "jijimon" }],
          deck: [
            { card: "BT1-009", as: "digivolveDraw" },
            { card: "BT1-085", as: "tamer" },
            { card: "BT1-064", as: "rest1" },
            { card: "BT1-065", as: "rest2" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jijimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest1").instanceId, s.inst("rest2").instanceId]),
    );
  });

  it("Q2090: a dual-color green/black Tamer reveals only one card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-056", as: "jijimon" },
            { card: "BT23-083", as: "dualTamer" },
          ],
          deck: [
            { card: "BT1-064", as: "revealed" },
            { card: "BT1-065", as: "notRevealed" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jijimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("revealed").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notRevealed").instanceId);
  });

  it("Q2089: may play a lower-cost revealed subset instead of filling the budget", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-056", as: "jijimon" },
            { card: "BT1-009", as: "spare" },
            { card: "BT1-088", as: "greenTamer" },
            { card: "BT1-089", as: "secondGreenTamer" },
          ],
          deck: [
            { card: "BT1-009", as: "normalDraw" },
            { card: "BT1-081", as: "overBudget" },
            { card: "BT1-064", as: "chosen" },
            { card: "BT1-009", as: "nextNormalDraw" },
            { card: "BT1-081", as: "thirdOverBudget" },
            { card: "BT1-064", as: "thirdChosen" },
            { card: "BT1-009", as: "deckSpare1" },
            { card: "BT1-010", as: "deckSpare2" },
          ],
        },
        1: { deck: ["BT1-011", "BT1-012", "BT1-013"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const chosenId = s.inst("chosen").instanceId;
    const thirdChosenId = s.inst("thirdChosen").instanceId;
    preferred.push(chosenId);
    const jijimonId = s.perm("jijimon").permanentId;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: jijimonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("chosen").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("overBudget").instanceId, s.inst("thirdOverBudget").instanceId, thirdChosenId]),
    );

    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([jijimonId]);
    const deckAfterFirstAttack = s.state.players[0]!.deck.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: jijimonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("jijimon").isSuspended);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(deckAfterFirstAttack);
    expect(
      s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.instanceId === s.inst("thirdChosen").instanceId),
    ).toHaveLength(0);

    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferred.splice(0, preferred.length, thirdChosenId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: jijimonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === thirdChosenId));
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(
      s.inst("thirdOverBudget").instanceId,
    );
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
