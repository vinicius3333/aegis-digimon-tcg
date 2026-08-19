import { describe, expect, it } from "vitest";
import { compiled as BT24_078 } from "./BT24-078.js";
import "../index.js";

describe("BT24-078 Creepymon (X Antibody)", () => {
  it("digivolves from trash before trashing security and uses a dynamic total play-cost budget", () => {
    const trash = BT24_078.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as any;
    expect(trash).toMatchObject({ event: "whenAttacking" });
    expect(trash.actions).toEqual([
      expect.objectContaining({ kind: "Digivolve", from: ["trash"], payCost: false, abortOnDecline: true }),
      expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }),
    ]);

    const whenDigivolving = BT24_078.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions?.[1]).toMatchObject({
      kind: "PlayMultiple",
      from: ["trash"],
      totalCost: 4,
      totalCostScaling: { base: 4, raise: 4, per: 10, filter: { zone: "trash", controller: "opponent" } },
    });
  });
});
