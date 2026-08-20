import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-062.js";

describe("EX9-062", () => {
  it("is treated as Kimeramon and on play or digivolution trashes sources based on face-down count then returns a DM Digimon", () => {
    expect(compiled.effects?.some((entry) => entry.trigger === "Static")).toBe(false);
    expect(compiled.coverage).toBe("full");
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Trash", scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 } }, { kind: "Return", to: "hand", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["DM"], match: "trait" }] } } }] });
  });
  it("plays a level-four-or-lower DM Digimon from trash as inherited text", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { filter: { levelComparison: { op: "lte", value: 4 } } } }));
});
