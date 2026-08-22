import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-025.js";
import "../index.js";

describe("BT21-025 compiled implementation", () => {
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

  it("trashes the opponent's top security card when an eligible attack target changes", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Progress", raw: "＜Progress＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenAttackTargetSwitched",
            actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
          },
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            actions: [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    dp: { op: "lte", value: 5000 },
                    nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
                  },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
  });

  it("plays a qualifying Reptile or Dragonkin when the opponent's security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-025", as: "host", under: ["BT21-025"] }],
          hand: [{ card: "BT21-055", as: "qualifying" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("qualifying").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
