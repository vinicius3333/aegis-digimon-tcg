import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./BT11-071.js";
describe("BT11-071 MusouKnightmon", () => {
  it("places an eligible card from trash as its top source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT11-071", as: "musou" }], trash: [{ card: "BT11-082", as: "tuwarmon" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("musou"));
    expect(s.perm("musou").stack.some((card) => card.cardId === "BT11-082")).toBe(true);
  });
});
