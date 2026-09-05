import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-025.js";

describe("EX1-025 Salamon", () => {
  it("draws 1 on attack with 3 or more security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
        deck: ["BT1-009"],
        security: ["BT1-001", "BT1-001", "BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw with fewer than 3 security cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }],
        deck: ["BT1-009"],
        security: ["BT1-001", "BT1-001"],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
