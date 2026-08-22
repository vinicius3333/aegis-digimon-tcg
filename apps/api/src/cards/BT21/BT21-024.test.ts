import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-024.js";

describe("BT21-024 compiled implementation", () => {
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

  it("places an opponent hand card as bottom security only at five or fewer, then trashes the top card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({
          trigger,
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "opponent",
              amount: 1,
              source: "hand",
              condition: {
                kind: "zoneCount",
                seat: "opponent",
                zone: "security",
                op: "lte",
                value: 5,
                raw: "your opponent has 5 or fewer security cards",
              },
            },
            { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
          ],
        }),
      );
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            amount: 4000,
            duration: "permanent",
          },
        ],
      }),
    );
  });
});
