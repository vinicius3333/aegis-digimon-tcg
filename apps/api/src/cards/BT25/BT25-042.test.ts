import { describe, expect, it } from "vitest";
import { compiled as BT25_042 } from "./BT25-042.js";
import "../index.js";

describe("BT25-042 ClavisAngemon", () => {
  it("uses the top-or-bottom security cost for each shared Once Per Turn immunity trigger", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_042.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.frequency).toBe("OncePerTurn");
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "GrantStatic",
        grant: "immuneToOpponentDigimonEffects",
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine" }, count: 1 },
          raw: "By trashing your top or bottom security card",
        },
      });
    }
  });

  it("reacts only to removal from its own security stack before granting the follow-up keywords", () => {
    const effect = BT25_042.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] };
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(watcher.event).toBe("whenSecurityRemoved");
    expect(watcher.sourceFilter).toEqual({ controller: "mine" });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
      },
    });
  });
});
