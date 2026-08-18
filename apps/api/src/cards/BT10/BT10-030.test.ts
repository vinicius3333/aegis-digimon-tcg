import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-030.js";

describe("BT10-030 Tinkermon", () => {
  it("offers only opposing level-5-or-lower Digimon and gives the chosen one exactly -1 check", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT10-030", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-060", as: "levelFive" },
            { card: "BT10-020", as: "levelFour" },
            { card: "BT1-062", as: "levelSix" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const pending = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;
    expect(request).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "BT10-030",
      options: { min: 1, max: 1 },
    });
    expect(new Set(request.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("levelFive").permanentId, s.perm("levelFour").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("levelFive").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("levelFive"), "SecurityAttack") === -1);

    expect(observe(s.engine).keywordAmount(s.perm("levelFour"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("levelSix"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });

  it("keeps the debuff after the target becomes level 6, then expires at opponent turn end (Q1952)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-030", as: "source" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT1-060", as: "target" }],
          hand: [{ card: "BT1-062", as: "levelSix" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => mainPhase.isOpen && s.state.turnSeat === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("levelSix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-062");
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await opponentTurn;
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    assertNoLoudGap(s);
  });
});
