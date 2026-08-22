import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-074.js";
describe("BT21-074 Satellamon", () => {
  it("protects a Digimon and shares once-per-turn De-Digivolve", () => {
    expect(
      compiled.effects.filter((e) => e.trigger === "OnPlay" || e.trigger === "WhenDigivolving").length,
    ).toBeGreaterThanOrEqual(3);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({ kind: "DeDigivolve", amount: 1, cost: expect.objectContaining({ kind: "trash" }) }),
        ],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
          }),
        ],
      }),
    );
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places an Appmon under a Digimon and protects that Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-074", as: "satellamon" },
            { card: "BT21-070", as: "appmon" },
          ],
          battleArea: [{ card: "BT1-009", as: "host" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satellamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT21-070"));

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT21-070");
    expect(s.perm("host").stack).toHaveLength(1);
  });
});
