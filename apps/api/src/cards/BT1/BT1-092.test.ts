import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT1-092.js";

describe("BT1-092 Nuclear Laser", () => {
  it("Q960 draws 2, requires the UI to choose 1 Digimon, and buffs only that target for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-011", as: "secondTarget" },
          ],
          hand: [{ card: "BT1-092", as: "option" }],
          deck: [{ card: "BT1-001", as: "firstDraw" }, { card: "BT1-002", as: "secondDraw" }, "BT1-003"],
        },
        1: { deck: ["BT1-003"] },
      },
      { autoSelectCards: false },
    );
    const firstBaseDP = s.perm("firstTarget").currentDP;
    const secondBaseDP = s.perm("secondTarget").currentDP;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT1-092");
    expect(decision.options?.min).toBe(1);
    expect(decision.options?.max).toBe(1);
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("firstTarget").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").currentDP === firstBaseDP + 2000);

    expect(s.perm("secondTarget").currentDP).toBe(secondBaseDP);
    await advance(s.engine).runTurn(0);

    expect(s.perm("firstTarget").currentDP).toBe(firstBaseDP);
    expect(s.perm("secondTarget").currentDP).toBe(secondBaseDP);
  });

  it("Q960 still draws 2 when no Digimon exists to receive the DP bonus", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "redTamer" }],
          hand: [{ card: "BT1-092", as: "option" }],
          deck: [
            { card: "BT1-001", as: "firstDraw" },
            { card: "BT1-002", as: "secondDraw" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    const optionInstanceId = s.inst("option").instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.length === 2 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDraw").instanceId, s.inst("secondDraw").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionInstanceId);
  });
});
