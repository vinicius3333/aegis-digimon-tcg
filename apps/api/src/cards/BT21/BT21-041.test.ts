import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-041.js";
import "../index.js";

describe("BT21-041 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("preserves the Appmon link requirement and linked Security Digimon DP reduction", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    const linkedTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn" && effect.isLinked);
    expect(linkedTurn?.actions).toEqual([
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"], zone: "security" } },
        amount: -3000,
        duration: "permanent",
      },
    ]);
  });

  it("plays Calendamon from Security without paying its cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT21-041", as: "calendamon", faceUp: true }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("calendamon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("calendamon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("calendamon").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });
});
