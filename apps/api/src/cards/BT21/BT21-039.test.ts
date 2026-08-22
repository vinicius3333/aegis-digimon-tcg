import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-039.js";
import "../index.js";

describe("BT21-039 compiled implementation", () => {
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

  it("preserves Alliance", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
    );
  });

  it("optionally plays a level 4 or lower WG Digimon from hand when digivolving", () => {
    const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions).toEqual([
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
          },
          count: 1,
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      },
    ]);
  });

  it("once per turn lets another Digimon digivolve from hand into a WG Digimon for free", () => {
    const whenAttacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(whenAttacking?.actions).toEqual([
      {
        kind: "Digivolve",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["WG"], match: "trait" }],
        },
        payCost: false,
        from: ["hand"],
        optional: true,
      },
    ]);
  });

  it("enters through the public play intent with Alliance and WG evolution hooks registered", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT21-039", as: "gryphonmon" }] } });
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gryphonmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gryphonmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("gryphonmon").instanceId)).toBe(
      true,
    );
  });
});
