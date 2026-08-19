import { describe, expect, it } from "vitest";
import { compiled as BT25_043 } from "./BT25-043.js";
import "../index.js";

describe("BT25-043 Habakirimon", () => {
  it("recovers first, then trashes the top security of a player with the most security", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_043.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(3);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "RecoverByTrashingMostSecurity",
        amount: 1,
        recover: false,
      });
      expect((effect?.actions?.[1] as { optional?: boolean }).optional).toBeUndefined();
    }
  });

  it("prevents all matching Glowing Dawn Digimon from leaving with one once-per-turn replacement", () => {
    const effect = BT25_043.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as {
      affectsAll?: boolean;
      target?: { filter?: unknown; count?: unknown };
      frequency?: string;
    };
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.target).toMatchObject({
      count: "all",
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
      },
    });
  });
});
