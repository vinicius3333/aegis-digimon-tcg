import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-070.js";
describe("BT11-070 Destromon", () => {
  it("resolves the reveal-and-trash timing", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-070", as: "destromon" }], deck: ["BT1-001"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("destromon"));
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
