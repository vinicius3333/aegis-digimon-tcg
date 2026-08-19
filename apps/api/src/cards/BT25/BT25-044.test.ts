import { describe, expect, it } from "vitest";
import { compiled as BT25_044 } from "./BT25-044.js";
import "../index.js";

describe("BT25-044 Junomon", () => {
  it("places another Digimon on top of security, then trashes both players' top security cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_044.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(2);

      const [place, trash] = effect!.actions!;
      expect(place).toMatchObject({
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        controller: "mine",
        toTop: true,
        source: {
          filter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] },
          count: 1,
        },
      });
      expect(trash).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "mine",
        bothPlayers: true,
        amount: 1,
      });
      expect((place as { optional?: boolean }).optional).toBeUndefined();
      expect((trash as { optional?: boolean }).optional).toBeUndefined();
    }
  });

  it("keeps the once-per-turn security-removal play effect restricted to Angel/Archangel/Iliad", () => {
    const effect = BT25_044.effects?.find((entry) => entry.trigger === "AllTurns");
    const subtrigger = effect?.actions?.[0] as { event?: string; actions?: unknown[] };
    expect(subtrigger.event).toBe("whenSecurityRemoved");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(subtrigger.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          playCostLte: 8,
          nameOrTrait: [{ tokens: ["Angel", "Archangel", "Iliad"], match: "trait" }],
        },
      },
    });
  });
});
