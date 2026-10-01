import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settleAcrossTimers, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-055.js";
import "./BT7-077.js";

describe("BT7-055 Ebonwumon", () => {
  it("publishes the unsuspend cost only during the opponent's turn", () => {
    expect(runtimeCompiledCard("BT7-055")?.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: { count: "all" },
          restriction: "unsuspendHandTrashCost",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
  });

  it("suspends an opposing Digimon and gains memory for all opposing suspended Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-055", as: "ebon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target" },
            { card: "BT1-011", suspended: true, as: "already" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ebon"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("requires the opponent to trash a hand card before an effect can unsuspend their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-055", as: "ebon" }] },
        1: {
          battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
          hand: [{ card: "BT1-011", as: "payment" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
  });

  it("pays the granted unsuspend cost as the paying player's own effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-055", as: "ebon" }] },
        1: {
          battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
          hand: [{ card: "BT7-077", as: "payment" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

    // BT7-055 GRANTS the cost to its opponent's Digimon, so the payment is that player's own
    // effect trashing from their hand — BT7-077's "when you trash this card in your hand using
    // one of your effects" reads it as such and gains 1 memory.
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});

describe("BT7-055 Ebonwumon — KB Q&A rulings", () => {
  const opponentDeck = ["BT1-012", "BT1-012"];

  const unsuspendPrompts = (s: EngineSetup) =>
    s.decisions.filter(
      (decision) =>
        decision.seat === 1 &&
        decision.req.kind === "selectCards" &&
        (decision.req.promptText ?? "").includes("to unsuspend"),
    );

  const isInTrash = (s: EngineSetup, alias: string) =>
    s.state.players[1]!.trash.some((card) => card.instanceId === s.inst(alias).instanceId);

  const isInHand = (s: EngineSetup, alias: string) =>
    s.state.players[1]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);

  /**
   * Runs the opponent's whole production turn, answering each hand-trash unsuspend prompt of
   * its unsuspend phase with the next payment in order (an empty payment declines).
   */
  async function runOpponentTurn(s: EngineSetup, payments: string[][]): Promise<void> {
    s.state.turnSeat = 1;
    await s.ready();
    let finished = false;
    const turn = advance(s.engine)
      .runTurn(1)
      .then(() => {
        finished = true;
      });
    for (const [index, payment] of payments.entries()) {
      await settleAcrossTimers(() => finished || unsuspendPrompts(s).length > index);
      if (finished) break;
      const prompt = unsuspendPrompts(s)[index]!;
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: prompt.req.decisionId,
          response: { kind: "selectCards", instanceIds: payment },
        }),
      ).toEqual({ ok: true });
    }
    await turn;
  }

  it("makes the opponent trash 1 hand card for each Digimon they unsuspend, not 1 for all (Q1596)", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT7-055"] },
      1: {
        battleArea: [
          { card: "BT1-010", suspended: true, as: "first" },
          { card: "BT1-011", suspended: true, as: "second" },
        ],
        hand: [
          { card: "BT1-012", as: "firstPayment" },
          { card: "BT1-012", as: "secondPayment" },
          { card: "BT1-012", as: "kept" },
        ],
        deck: opponentDeck,
      },
    });

    await runOpponentTurn(s, [[s.inst("firstPayment").instanceId], [s.inst("secondPayment").instanceId]]);

    expect(unsuspendPrompts(s).map((prompt) => prompt.req.options?.max)).toEqual([1, 1]);
    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(isInTrash(s, "firstPayment")).toBe(true);
    expect(isInTrash(s, "secondPayment")).toBe(true);
    expect(isInHand(s, "kept")).toBe(true);
  });

  it("never forces a trash; a Digimon whose controller declines stays suspended, by effect or unsuspend phase (Q1597)", async () => {
    const byEffect = setupEngine(
      {
        0: { battleArea: ["BT7-055"] },
        1: {
          battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
          hand: [{ card: "BT1-012", as: "card" }],
        },
      },
      { autoDeclineOptional: true },
    );
    byEffect.state.turnSeat = 1;
    await byEffect.ready();

    await advance(byEffect.engine).verb.unsuspend([byEffect.perm("target").permanentId]);

    expect(unsuspendPrompts(byEffect)[0]?.req.options?.min).toBe(0);
    expect(byEffect.perm("target").isSuspended).toBe(true);
    expect(isInHand(byEffect, "card")).toBe(true);

    const byPhase = setupEngine({
      0: { battleArea: ["BT7-055"] },
      1: {
        battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
        hand: [{ card: "BT1-012", as: "card" }],
        deck: opponentDeck,
      },
    });

    await runOpponentTurn(byPhase, [[]]);

    expect(unsuspendPrompts(byPhase)[0]?.req.options?.min).toBe(0);
    expect(byPhase.perm("target").isSuspended).toBe(true);
    expect(isInHand(byPhase, "card")).toBe(true);
  });

  it("lets the opponent choose which Digimon to unsuspend with fewer hand cards than suspended Digimon (Q1598)", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT7-055"] },
      1: {
        battleArea: [
          { card: "BT1-010", suspended: true, as: "skipped" },
          { card: "BT1-011", suspended: true, as: "chosen" },
          { card: "BT1-010", suspended: true, as: "unpaid" },
        ],
        hand: [{ card: "BT1-012", as: "payment" }],
        deck: opponentDeck,
      },
    });

    await runOpponentTurn(s, [[], [s.inst("payment").instanceId]]);

    expect(s.perm("skipped").isSuspended).toBe(true);
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(s.perm("unpaid").isSuspended).toBe(true);
    expect(isInTrash(s, "payment")).toBe(true);
  });

  it("lets the opponent unsuspend their Tamers without trashing hand cards (Q1599)", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT7-055"] },
      1: {
        battleArea: [
          { card: "ST1-12", suspended: true, as: "tamer" },
          { card: "BT1-010", suspended: true, as: "digimon" },
        ],
        hand: [{ card: "BT1-012", as: "card" }],
        deck: opponentDeck,
      },
    });

    await runOpponentTurn(s, [[]]);

    expect(unsuspendPrompts(s)).toHaveLength(1);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(isInHand(s, "card")).toBe(true);
  });

  it("makes the opponent trash 2 hand cards per Digimon while two Ebonwumon are in play (Q1600)", async () => {
    const twoEbonwumon = () =>
      setupEngine({
        0: { battleArea: ["BT7-055", "BT7-055"] },
        1: {
          battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
          hand: [
            { card: "BT1-012", as: "firstPayment" },
            { card: "BT1-012", as: "secondPayment" },
          ],
          deck: opponentDeck,
        },
      });

    const underpaid = twoEbonwumon();
    await runOpponentTurn(underpaid, [[underpaid.inst("firstPayment").instanceId]]);

    expect(unsuspendPrompts(underpaid)[0]?.req.options?.max).toBe(2);
    expect(underpaid.perm("target").isSuspended).toBe(true);
    expect(isInHand(underpaid, "firstPayment")).toBe(true);

    const paid = twoEbonwumon();
    await runOpponentTurn(paid, [[paid.inst("firstPayment").instanceId, paid.inst("secondPayment").instanceId]]);

    expect(paid.perm("target").isSuspended).toBe(false);
    expect(isInTrash(paid, "firstPayment")).toBe(true);
    expect(isInTrash(paid, "secondPayment")).toBe(true);
  });
});
