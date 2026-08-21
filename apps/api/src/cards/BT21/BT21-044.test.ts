import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-044.js";
import "../index.js";

describe("BT21-044 compiled implementation", () => {
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

  it("preserves the GeoGreymon alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["GeoGreymon"], cost: 3, isAlternate: true }]);
  });

  it("grants one Marcus Damon the temporary Digimon, DP, restriction, and keyword effects", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "GrantStatic",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          grant: "kinds",
          tokens: ["Digimon"],
          duration: "forTheTurn",
        },
        {
          kind: "SetBaseDP",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          value: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "Restrict",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          restriction: "digivolve",
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] },
            count: 1,
          },
          keyword: { keyword: "Alliance", raw: "＜Alliance＞" },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          withoutSuspending: false,
          optional: true,
        },
      ]);
    }
  });

  it("shares one once-per-turn budget between the main and inherited deletion watchers", () => {
    const watchers = compiled.effects.filter((effect) => effect.trigger === "AllTurns");
    expect(watchers).toHaveLength(2);
    expect(watchers[0]).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "bt21-044-marcus-security" });
    expect(watchers[1]).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "bt21-044-marcus-security",
      isInherited: true,
    });
    expect(watchers[0]?.actions).toEqual(watchers[1]?.actions);
  });

  it("enters through the public play intent with Marcus and attack hooks registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-044", as: "rizegreymon" }] } });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rizegreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rizegreymon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("rizegreymon").instanceId)).toBe(
      true,
    );
  });
});
