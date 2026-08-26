import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-043.js";

describe("EX6-043 Diaboromon", () => {
  it("plays a Diaboromon token at start of main and when digivolving", () => {
    expect(compiled.effects?.some((entry) => entry.trigger === "Main")).toBe(false);
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"] as const)
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: ["Diaboromon"],
        count: 1,
        payCost: false,
        optional: true,
      });
  });
  it("gives other Diaboromon Jamming and Blocker and can reactivate its digivolving effect", () => {
    const allTurns = compiled.effects?.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "ActivateEffect", effectType: "WhenDigivolving", inherited: false }],
    });
    expect(allTurns?.[1]?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Jamming" },
      target: { count: "all" },
    });
    expect(allTurns?.[1]?.actions[1]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
    });
  });
});
