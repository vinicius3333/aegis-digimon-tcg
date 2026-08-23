import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-090.js";

describe("P-090 Diarbbitmon", () => {
  it("requires the UI to choose exactly 2 opponent Digimon to suspend when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [{ card: "P-090", as: "diarbbitmon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diarbbitmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.options?.min).toBe(2);
    expect(decision.options?.max).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("first").permanentId, s.perm("second").permanentId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("third").isSuspended).toBe(false);
  });

  it("unsuspends an ally after another Digimon wins a battle while Angoramon is in its stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-090", as: "diarbbitmon", suspended: true, under: ["P-060"] },
            { card: "BT1-079", as: "attacker", dp: 9000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000, suspended: true }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("diarbbitmon").permanentId);
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId) &&
        !s.perm("diarbbitmon").isSuspended,
    );

    expect(s.perm("diarbbitmon").isSuspended).toBe(false);
  });
});
