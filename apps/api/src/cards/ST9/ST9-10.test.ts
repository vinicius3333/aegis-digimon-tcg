import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-13.js";
import "./ST9-10.js";

describe("ST9-10 Snimon", () => {
  it("suspends an opponent Digimon on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST9-10", as: "snimon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } }, { autoOrderTriggers: true, autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("snimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("plays after losing its security battle and resolves On Play before the next security check", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-13", as: "attacker" }, { card: "ST9-02", as: "suspendTarget" }],
        },
        1: {
          security: ["ST9-02", { card: "ST9-10", as: "snimon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const snimonInstanceId = s.inst("snimon").instanceId;
    preferred.push(s.perm("suspendTarget").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId) &&
        s.perm("suspendTarget").isSuspended,
      3000,
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === snimonInstanceId)).toBe(true);
    expect(s.perm("suspendTarget").isSuspended).toBe(true);
  });
});
