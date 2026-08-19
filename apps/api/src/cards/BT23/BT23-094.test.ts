import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-094.js";

describe("BT23-094 Nanomachine Break", () => {
  it("applies Security Attack -1 and disables When Digivolving/When Attacking", () => {
    for (const trigger of ["Main", "Security"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger && !entry.keywords) as any;
      expect(effect.actions[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: -1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "DisableTimingEffect",
        timings: ["whenDigivolving", "whenAttacking"],
      });
    }
  });

  it("arms a separate Delay payload from a CS Digimon attack", () => {
    const turn = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    const delay = compiled.effects.find((entry) =>
      entry.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    expect(delay.actions[1]).toMatchObject({
      kind: "DisableTimingEffect",
      timings: ["whenDigivolving", "whenAttacking"],
    });
  });
});
