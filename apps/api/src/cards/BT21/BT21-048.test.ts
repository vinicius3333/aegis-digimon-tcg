import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-048.js";
import "../index.js";

describe("BT21-048 compiled implementation", () => {
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

  it("preserves the WG alternate Digivolution requirement and inherited Piercing", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      }),
    );
  });

  it("optionally suspends one Digimon of either side on play", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      {
        kind: "Suspend",
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
        optional: true,
      },
    ]);
  });

  it("enters through the public play intent with its On Play optional effect registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-048", as: "mushroomon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mushroomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("mushroomon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("mushroomon").instanceId)).toBe(
      true,
    );
  });
});
