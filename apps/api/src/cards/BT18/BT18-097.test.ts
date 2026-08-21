import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/index.js";
import { compiled } from "./BT18-097.js";

describe("BT18-097 Dark to Light, Thunder to Gunfire", () => {
  it("covers the five-card Hybrid placement and MagnaGarurumon alternative", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "PlaceUnder", target: { count: 5, upTo: true, from: ["hand", "trash"] }, underFilter: { kind: ["Tamer"] } },
        { kind: "Digivolve", payCost: false, from: ["hand", "trash"], ignoreRequirements: true, into: { nameOrTrait: [{ tokens: ["MagnaGarurumon"], match: "name" }] } },
      ],
    });
  });

  it("executes Security by playing an inherited-effect Tamer and returning this Option to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT18-097", as: "option", faceUp: true }], hand: [{ card: "BT18-088", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
