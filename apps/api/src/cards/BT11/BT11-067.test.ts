import { describe, expect, it } from "vitest";
import type { Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-067.js";

describe("BT11-067 Gigadramon", () => {
  it("has Jamming and grants inherited Reboot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-067", as: "gigadramon" },
          { card: "BT11-068", as: "host", under: ["BT11-067"] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("gigadramon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });

  it("survives a losing security battle with Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-067", as: "gigadramon" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gigadramon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("gigadramon").permanentId)).toBe(true);
  });

  it("unsuspends its host with inherited Reboot during the opponent's phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-068", as: "host", under: ["BT11-067"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("host").permanentId);
  });
});
