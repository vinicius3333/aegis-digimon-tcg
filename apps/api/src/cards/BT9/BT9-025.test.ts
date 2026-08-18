import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-025.js";

describe("BT9-025 TeslaJellymon", () => {
  it("once per turn may trash 2 hand cards at end of attack to unsuspend itself", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-025", as: "tesla", suspended: true }], hand: ["BT1-001", "BT1-002"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("tesla"));
    expect(s.perm("tesla").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
