import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-073.js";
describe("BT11-073 Justimon: Accel Arm", () => {
  it("returns a level 6 source when its digivolving effect is accepted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-073", as: "justimon", under: ["BT2-030"] }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("justimon"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-030")).toBe(true);
  });
});
