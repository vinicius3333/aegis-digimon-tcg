import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-033.js";

describe("EX5-033 Mitamamon", () => {
  it("can trash top security to play a yellow level four or lower Digimon and grant Rush", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        bindResultAs: "playedByThisEffect",
        cost: { kind: "trash", target: { filter: { zone: "security" }, position: "top" } },
      },
      {
        kind: "GainKeyword",
        target: { filter: { boundRef: "playedByThisEffect", kind: ["Digimon"] } },
        keyword: { keyword: "Rush" },
        duration: "forTheTurn",
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      bindResultAs: "playedByThisEffect",
    });
  });
  it("shares once-per-turn use between When Digivolving and When Attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
  });
});
