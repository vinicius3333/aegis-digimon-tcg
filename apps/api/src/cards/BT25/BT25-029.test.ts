import { describe, expect, it } from "vitest";
import { compiled as BT25_029 } from "./BT25-029.js";
import "../index.js";

describe("BT25-029 MirageGaogamon", () => {
  it("shares the Once Per Turn return sequence and requires one bottom face-down Tamer card", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_029.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        to: "hand",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          count: 1,
        },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Return",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
      });
    }
  });

  it("keeps both All Turns unsuspend watchers once per turn", () => {
    const effect = BT25_029.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", optional: true }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          optional: true,
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
        }),
      ]),
    );
  });
});
