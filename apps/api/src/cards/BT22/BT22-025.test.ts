import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-025.js";

describe("BT22-025 UlforceVeedramon", () => {
  it("keeps Blast Digivolve, the two On Play/When Digivolving modes, and once-per-turn self unsuspend", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Counter",
        isFromHand: true,
        keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "Return",
              to: "deckBottom",
              target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
            },
          ],
          [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Blue"], playCostLte: 4 }, count: 1 },
            },
          ],
        ],
      });
    }
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", optional: true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
    });
  });
});
