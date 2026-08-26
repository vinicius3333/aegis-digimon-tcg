import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-071.js";

describe("EX6-071 Pandemonium Lost", () => {
  it("keeps the five-card hand trash conditional but always executes the Then deletion", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", value: 5 } },
      {
        kind: "Delete",
        condition: undefined,
        target: {
          filter: {
            levelComparison: {
              op: "gte",
              scaling: { filter: { zone: "hand", controller: "opponent" }, unit: "cards", levelCeilingAdd: 1 },
            },
          },
        },
      },
    ]);
    expect(text).toContain("ActivateMain");
  });
});
