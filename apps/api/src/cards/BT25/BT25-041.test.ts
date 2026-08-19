import { describe, expect, it } from "vitest";
import { compiled as BT25_041 } from "./BT25-041.js";
import "../index.js";

describe("BT25-041 Murasamemon", () => {
  it("keeps both payment choices and both play/use choices", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_041.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.frequency).toBe("OncePerTurn");
      const payment = effect?.actions?.[0] as { kind?: string; options?: any[][] };
      expect(payment.kind).toBe("Modal");
      expect(payment.options).toHaveLength(2);
      expect(payment.options?.[0]?.[0]).toMatchObject({ cost: { kind: "securityToHand" } });
      expect(payment.options?.[1]?.[0]).toMatchObject({
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      });
      for (const branch of payment.options ?? []) {
        const cardChoice = branch[0];
        expect(cardChoice.kind).toBe("Modal");
        expect(cardChoice.options).toHaveLength(2);
        expect(cardChoice.options?.[0]?.[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 3 });
        expect(cardChoice.options?.[1]?.[0]).toMatchObject({ kind: "UseOptionWithoutCost", payCost: true, reduceCostBy: 3 });
      }
    }
  });

  it("uses the same bottom-face-down Tamer cost for inherited unsuspend", () => {
    const effect = BT25_041.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
  });
});
