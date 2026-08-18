import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-072.js";
describe("BT11-072 Machinedramon", () => {
  it("reveals five and trashes unmatched cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-072", as: "machine" }], deck: ["BT1-001", "BT1-002"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("machine"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });
});
