import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-029.js";
import "./EX1-031.js";

describe("EX1-031 Seraphimon", () => {
  it("recovers exactly the deck's top card when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base" }],
          hand: [{ card: "EX1-031", as: "evo" }],
          deck: ["BT1-009", { card: "BT1-009", as: "recovered" }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("recovered").instanceId),
    );
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.perm("base").topCard.cardId).toBe("EX1-031");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX1-029"]);
    // EX1-029's inherited [Your Turn] watcher is intentionally registered here: the
    // Recovery add also grants its controller +1 memory, so the peer interaction ends at 2.
    expect(s.state.memory).toBe(2);
  });

  it("rejects digivolving from a non-yellow level 5 boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "base" }],
        hand: [{ card: "EX1-031", as: "evo" }],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("EX1-028");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX1-031"]);
    expect(s.state.memory).toBe(5);
  });

  it("changes a real security battle while suspended on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-031", as: "seraphimon", suspended: true }],
          security: [{ card: "BT1-009", as: "securityDigimon" }, "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          security: ["BT1-009"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("seraphimon").isSuspended).toBe(true);
    expect(observe(s.engine).securityDp(0)).toBe(5000);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("securityDigimon").instanceId),
    ).toBe(true);
  });

  it("does not boost an unsuspended Seraphimon on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-031", as: "seraphimon" }],
        security: [{ card: "BT1-009", as: "securityDigimon" }, "BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("seraphimon").isSuspended).toBe(false);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("limits the +5000 to the controller's security and the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-031", as: "mine", suspended: true }],
        security: ["BT1-009"],
      },
      1: {
        battleArea: [{ card: "EX1-031", as: "theirs", suspended: true }],
        security: ["BT1-009"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).securityDp(0)).toBe(5000);
    expect(observe(s.engine).securityDp(1)).toBe(0);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(0);
    expect(observe(s.engine).securityDp(1)).toBe(5000);
  });
});
