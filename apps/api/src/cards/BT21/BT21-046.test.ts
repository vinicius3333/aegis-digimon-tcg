import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-046.js";
import "../index.js";

describe("BT21-046 compiled implementation", () => {
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

  it("preserves the zero-cost Dracomon alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Dracomon"], cost: 0, isAlternate: true }]);
  });

  it("optionally digivolves itself into a Coredramon from hand for free at both timings", () => {
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ trigger, optional: true });
      expect(effect?.actions).toEqual([
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Coredramon"], match: "name" }] },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ]);
    }
  });

  it("preserves the inherited end-of-turn DNA Digivolution from two of your Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "EndOfYourTurn",
        isInherited: true,
        actions: [
          {
            kind: "DnaDigivolve",
            materials: {
              filter: { controller: "mine", kind: ["Digimon"], includesSelf: true },
              count: 2,
              isSelf: true,
            },
            into: { controllerDefault: "mine", kind: ["Digimon"], zone: "hand" },
            payCost: true,
            optional: true,
          },
        ],
      }),
    );
  });

  it("enters through the public play intent before its start-main/evolution hooks resolve", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-046", as: "dracomonX" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracomonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dracomonX").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("dracomonX").instanceId)).toBe(
      true,
    );
  });
});
