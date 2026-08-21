import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-011.js";

describe("BT18-011 Agunimon", () => {
  it("returns a Hybrid Digimon from trash when digivolving", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash", controller: "mine", or: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] }, { kind: ["Tamer"], hasInheritedEffects: true }] } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-011", as: "agunimon" }], trash: ["BT12-009"] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("agunimon"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-009")).toBe(true);
  });
});
