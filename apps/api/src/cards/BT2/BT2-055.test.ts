import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-055.js";

describe("BT2-055 ToyAgumon", () => {
  it("grants Reboot to its host without immediately unsuspending it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-055"], suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("unsuspends its host during the opponent's unsuspend phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-055"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    const unsuspend = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);
    const unsuspendedIds = await unsuspend(1);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("host").permanentId);
  });

  it("does not have Reboot while ToyAgumon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-055", as: "toyAgumon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("toyAgumon"), "Reboot")).toBe(false);
  });
});
