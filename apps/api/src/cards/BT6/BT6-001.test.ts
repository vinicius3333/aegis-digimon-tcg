import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-062.js";
import "./BT6-001.js";

describe("BT6-001 DemiMeramon", () => {
  it("gives its host +1000 DP for the turn when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-007", under: ["BT6-001"], as: "host" }] },
      1: { security: ["BT1-010"] },
    });
    const baseDP = s.perm("host").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === baseDP + 1000);
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);
  });

  it("does not gain DP when its host attacks a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-007", under: ["BT6-001"], as: "host", dp: 10_000 }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1_000 }] },
    });
    const baseDP = s.perm("host").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").currentDP).toBe(baseDP);
  });

  it("does not give its host DP when a different Digimon attacks a player", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-007", under: ["BT6-001"], as: "host" },
          { card: "BT6-007", as: "otherAttacker" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    const baseDP = s.perm("host").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").currentDP).toBe(baseDP);
  });

  it("keeps the bonus when a player-directed attack is redirected by Blocker (Q1398)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-007", under: ["BT6-001"], as: "host", dp: 10_000 }],
      },
      1: {
        battleArea: [{ card: "BT5-062", as: "blocker" }],
        security: ["BT1-010"],
      },
    });
    const baseDP = s.perm("host").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").currentDP).toBe(baseDP + 1_000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
