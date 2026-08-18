import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-087.js";

describe("P-087 Ritsu Kodo", () => {
  it("Q4179: suspends when Pulsemon is played and gets both bonuses at exactly 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-087", as: "ritsu" }],
          hand: [{ card: "P-028", as: "pulsemon" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("ritsu").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("pulsemon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("ritsu").isSuspended &&
      s.state.players[0]!.hand.some((card) => card.instanceId === drawnId) &&
      s.state.memory === 8
    );

    expect({
      suspended: s.perm("ritsu").isSuspended,
      drew: s.state.players[0]!.hand.some((card) => card.instanceId === drawnId),
      memory: s.state.memory,
    }).toEqual({ suspended: true, drew: true, memory: 8 });
    expect(s.decisions.filter(({ req }) =>
      req.kind === "optional" && req.sourceCardId === "P-087"
    )).toHaveLength(1);
  });

  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-087", as: "ritsu" }] },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const ritsuId = s.inst("ritsu").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 4;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === ritsuId,
    ));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === ritsuId,
    )).toBe(true);
    expect(s.state.memory).toBe(4);
  });
});
