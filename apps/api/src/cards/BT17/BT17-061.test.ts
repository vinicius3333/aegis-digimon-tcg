import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-061.js";

describe("BT17-061 Goblimon", () => {
  it("deletes one other Digimon as the cost to delete an opposing level-4-or-lower Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } }, count: 1 },
      cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 } },
    });
  });

  it("has Retaliation as its inherited keyword", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Retaliation", raw: "＜Retaliation＞" }]);
  });
});
