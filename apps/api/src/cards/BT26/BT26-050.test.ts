import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-050.js";

describe("BT26-050 Rosemon: Burst Mode", () => {
  it("encodes the independent suspend/lock targets and security cost", () => {
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([
        { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
        {
          cost: 0,
          isAlternate: true,
          names: ["Rosemon"],
          burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
        },
      ]),
    );
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        { kind: "Return", to: "deckBottom" },
        { kind: "SecurityManipulation", op: "trashTop" },
      ],
    });
  });
});
