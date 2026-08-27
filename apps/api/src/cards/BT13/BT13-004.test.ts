import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-004.js";

describe("BT13-004 Budmon", () => {
  it("gives its evolved stack +1000 DP during its turn while the opponent has a suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", dp: 5000, under: ["BT13-004"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "suspendedOpponent", suspended: true }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("does not give the bonus while every opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", dp: 5000, under: ["BT13-004"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "activeOpponent" }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not give the bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", dp: 5000, under: ["BT13-004"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "suspendedOpponent", suspended: true }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("applies the bonus after an opposing Blocker suspends and before their battle (Q2257)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "attacker", dp: 5000, under: ["BT13-004"] }],
      },
      1: {
        battleArea: [{ card: "BT1-072", as: "blocker", dp: 5500 }],
        security: ["BT1-010"],
      },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
