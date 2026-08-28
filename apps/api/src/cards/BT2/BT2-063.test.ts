import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-055.js";
import "./BT2-063.js";

describe("BT2-063 MetalGreymon", () => {
  it("has printed Reboot and unsuspends during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-063", as: "metalGreymon", suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("metalGreymon"), "Reboot")).toBe(true);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("metalGreymon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("metalGreymon").permanentId);
  });

  it("grants Security Attack +1 to its host while that host has Reboot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-064", as: "host", under: ["BT2-055", "BT2-056", "BT2-063"] }],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 when its host lacks Reboot", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-064", as: "host", under: ["BT2-056", "BT2-063"] }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("does not grant Security Attack +1 during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-064", as: "host", under: ["BT2-055", "BT2-056", "BT2-063"] }],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
