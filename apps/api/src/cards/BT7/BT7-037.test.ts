import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT5/BT5-062.js";
import "./BT7-037.js";

describe("BT7-037 Boutmon", () => {
  it("unsuspends before the block window so its Blocker host can block (Q1566)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-062", under: ["BT7-037"], suspended: true, as: "host" }],
        security: ["BT1-101", "BT1-101", "BT1-101"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("host").permanentId],
    });
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("does not unsuspend when the opponent attacks a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-034", under: ["BT7-037"], suspended: true, as: "host" },
          { card: "BT1-010", suspended: true, as: "target", dp: 1_000 },
        ],
        security: ["BT1-101", "BT1-101", "BT1-101"],
      },
      1: { battleArea: [{ card: "BT1-081", as: "attacker", dp: 10_000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === targetInstanceId),
    );

    expect(s.perm("host").isSuspended).toBe(true);
  });
});
