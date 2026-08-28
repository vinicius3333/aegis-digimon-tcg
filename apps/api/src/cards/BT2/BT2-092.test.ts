import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-092.js";

describe("BT2-092 Radiation Blade", () => {
  it("gives exactly two selected Digimon Security Attack +1 for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-009", as: "first" },
            { card: "BT2-010", as: "second" },
            { card: "BT2-011", as: "third" },
          ],
          hand: [{ card: "BT2-092", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("first"), "SecurityAttack"));

    expect(observe(s.engine).hasKeyword(s.perm("first"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("second"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("third"), "SecurityAttack")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("offers up to two of only the controller's Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-009", as: "first" },
          { card: "BT2-010", as: "second" },
        ],
        hand: [{ card: "BT2-092", as: "option" }],
      },
      1: { battleArea: [{ card: "BT2-011", as: "opponent" }] },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const selection = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === selection.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("opponent").permanentId);
    expect(request.options).toMatchObject({ min: 0, max: 2 });
  });

  it("may select no Digimon because the effect says up to two", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-009", as: "first" },
          { card: "BT2-010", as: "second" },
        ],
        hand: [{ card: "BT2-092", as: "option" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).hasKeyword(s.perm("first"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("second"), "SecurityAttack")).toBe(false);
  });
});
