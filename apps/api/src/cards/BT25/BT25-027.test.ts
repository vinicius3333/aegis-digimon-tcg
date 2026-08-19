import { describe, expect, it } from "vitest";
import { compiled as BT25_027 } from "./BT25-027.js";
import "../index.js";

describe("BT25-027 MachGaogamon", () => {
  it("shares the Once Per Turn return-and-unsuspend sequence", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_027.effects?.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Return",
        optional: true,
        to: "hand",
        target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Unsuspend",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      });
    }
  });

  it("protects the source and the inherited Gaogamon/DATA SQUAD target", () => {
    const main = BT25_027.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited);
    expect(main?.frequency).toBe("OncePerTurn");
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: { isSelfRef: true },
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
    const inherited = BT25_027.effects?.find((entry) => entry.isInherited);
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      sourceFilter: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Gaogamon"], match: "name" },
          { tokens: ["DATA SQUAD"], match: "trait" },
        ],
      },
      cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
    });
  });
});
