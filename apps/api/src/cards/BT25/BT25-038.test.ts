import { describe, expect, it } from "vitest";
import { compiled as BT25_038 } from "./BT25-038.js";
import "../index.js";

describe("BT25-038 Shakkoumon", () => {
  it("places an eligible Digimon as security and conditionally trashes both security tops", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_038.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTopOrBottom",
        controller: "mine",
        amount: 1,
        optional: true,
        source: { location: ["hand", "digivolution"], filter: { trait: ["Angel", "Archangel", "Three Great Angels", "Iliad"] } },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        bothPlayers: true,
        amount: 1,
        condition: { kind: "raw", raw: "DNA digivolving" },
      });
    }
  });

  it("watches only the controller's security additions/removals", () => {
    const effects = BT25_038.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      const watcher = effect.actions?.[0] as { event?: string; sourceFilter?: unknown };
      expect(watcher.sourceFilter).toEqual({ controller: "mine" });
      expect(effect.frequency).toBe("OncePerTurn");
    }
  });
});
