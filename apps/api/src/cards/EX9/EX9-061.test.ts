import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-061.js";

describe("EX9-061", () => {
  it("has Training and once per turn deletes an opposing Digimon with a level limit scaling by face-down sources when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.actions.some((action) => action.kind === "GainKeyword"))?.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Training" } }));
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0] as any;
    expect(action).toMatchObject({ kind: "Delete", cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } });
    expect(action?.target?.filter?.levelComparison).toMatchObject({ op: "lte", value: 3, scaling: { unit: "selfFaceDownDigivolutionCards", per: 2 } });
  });
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Retaliation" } })));
});
