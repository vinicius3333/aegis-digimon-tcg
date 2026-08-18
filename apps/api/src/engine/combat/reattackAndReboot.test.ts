import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("attack eligibility after unsuspending", () => {
  it("EX4-019 MachGaogamon may attack again after its When Attacking effect unsuspends it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-035", under: ["EX4-019"], as: "machgaoga" }] },
      1: {
        hand: Array.from({ length: 8 }, () => "BT1-001"),
        security: ["BT1-101", "BT1-101", "BT1-101"],
      },
    });
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("machgaoga").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      !s.perm("machgaoga").isSuspended &&
      s.state.players[1]!.security.length === 2 &&
      s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX4-019") &&
      !observe(s.engine).isAttacking(),
    );
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("machgaoga"))).toBe(false);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("machgaoga").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
  });
});

describe("Reboot timing", () => {
  it("a Digimon with printed Reboot remains suspended after attacking on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-068", as: "rebooter" }] },
      1: { security: ["BT1-101", "BT1-101"] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("rebooter").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("rebooter").isSuspended);

    expect(s.perm("rebooter").isSuspended).toBe(true);
  });

  it("a Digimon with inherited Reboot remains suspended after attacking on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["BT2-055"], as: "inherited-rebooter" }] },
      1: { security: ["BT1-101", "BT1-101"] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("inherited-rebooter").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.perm("inherited-rebooter").isSuspended);

    expect(s.perm("inherited-rebooter").isSuspended).toBe(true);
  });
});
