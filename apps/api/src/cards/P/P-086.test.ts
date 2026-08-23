import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-086.js";

describe("P-086 Syakomon", () => {
  it("protects one friendly Digimon from attacks with a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-086", as: "source" }],
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-009", as: "target" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked") && s.state.pendingDecision === undefined,
    );
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked")).toBe(true);

    s.state.turnSeat = 1;
    await s.ready();
    advance(s.engine).ledgers.continuous.sweep(s.state, "opponentTurnEnd", 1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked")).toBe(false);
  });

  it("does not grant protection without a blue Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-086", as: "source" }],
          battleArea: [
            { card: "BT1-085", as: "red-tamer" },
            { card: "BT1-009", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked")).toBe(false);
  });

  it("identifies same-card permanents separately in the target decision", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-086", as: "source" }],
          battleArea: [
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-009", as: "plain" },
            { card: "BT1-009", as: "stacked", under: ["BT1-001"] },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-086");
    expect(decision.options).toMatchObject({ min: 1, max: 1 });
    expect(decision.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("plain").permanentId, s.perm("stacked").permanentId]),
    );
    expect(s.perm("plain").permanentId).not.toBe(s.perm("stacked").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("stacked").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("stacked"), "cantBeAttacked"));
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "cantBeAttacked")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("plain"), "cantBeAttacked")).toBe(false);
  });
});
