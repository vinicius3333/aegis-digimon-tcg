import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-013.js";

describe("EX7-013 BeelStarmon", () => {
  it("uses a Three Musketeers Option from hand without cost and draws until six on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: false, optional: true }, { kind: "Draw", amount: "until", targetCount: 6 }]);
  });
  it("can gain Security Attack +1 by trashing an Option stack card then attacks once per turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, cost: { kind: "trash", target: { filter: { zone: "digivolutionCards" } } } }, { kind: "Attack", optional: false }] }));
});
