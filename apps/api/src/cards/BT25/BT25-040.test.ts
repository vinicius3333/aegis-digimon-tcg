import { describe, expect, it } from "vitest";
import { compiled as BT25_040 } from "./BT25-040.js";
import "../index.js";

describe("BT25-040 MagnaAngemon", () => {
  it("fires its security-trash play effect only for direct effect trashing", () => {
    const effect = BT25_040.effects?.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
      },
    });
    expect(BT25_040.effects?.some((entry) => entry.trigger === "Static" && entry.actions?.[0]?.kind === "PlayWithoutCost")).toBe(false);
  });

  it("scopes the inherited DP trigger to removal from its own security stack", () => {
    const effect = BT25_040.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher.event).toBe("whenSecurityRemoved");
    expect(watcher.sourceFilter).toEqual({ controller: "mine" });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });
});
