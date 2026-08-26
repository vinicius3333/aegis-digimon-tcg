import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-069.js";

describe("EX6-069 Rise of the Seven Great Demon Lords", () => {
  it("scopes the Delay play to a Gate of Deadly Sins in breeding, plus Security placement", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("Seven Great Demon Lords");
    expect(text).toContain("Gate of Deadly Sins");
    expect(text).toContain("onDeletionOf");
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      actions: [
        {
          kind: "PlayWithoutCost",
          source: "breeding",
          target: { filter: { zone: "digivolutionCards", hostFilter: { zone: "breeding" } } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      position: "bottom",
    });
    expect(text).toContain("PlaceInBattleAreaSelf");
  });
});
