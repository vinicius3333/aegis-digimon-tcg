import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-033.js";

describe("EX5-033 Mitamamon", () => {
  it("can trash top security to play a yellow level four or lower Digimon and grant Rush", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand"], cost: { kind: "trash", target: { filter: { zone: "security" } } } }, { kind: "GainKeyword", keyword: { keyword: "Rush" } }]);
  });
  it("shares once-per-turn use between When Digivolving and When Attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
  });
});
