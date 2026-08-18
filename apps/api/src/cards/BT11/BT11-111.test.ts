import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-111.js";
describe("BT11-111 Galacticmon", () => {
  it("trashes the opponent's top security at start of main", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-111", as: "galactic" }] },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("galactic"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
