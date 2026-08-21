import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-042.js";
import "../index.js";

describe("BT21-042 compiled implementation", () => {
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

  it("preserves the Agumon Dinosaur alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], traits: ["Dinosaur"], cost: 2, isAlternate: true },
    ]);
  });

  it("once per turn offers a free yellow RizeGreymon evolution when a Marcus Damon is played", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }],
        },
        actions: [
          {
            kind: "Digivolve",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              nameOrTrait: [{ tokens: ["RizeGreymon"], match: "name" }],
            },
            payCost: false,
            from: ["hand"],
            optional: true,
          },
        ],
      },
    ]);
  });

  it("preserves the inherited +2000 DP Your Turn modifier", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 2000,
            duration: "permanent",
          },
        ],
      }),
    );
  });

  it("plays through the public intent and exposes the +2000 DP Your Turn modifier", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-042", as: "geogreymon" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geogreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("geogreymon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("geogreymon").instanceId)?.currentDP,
    ).toBe(5000);
  });
});
