import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-059.js";

describe("EX9-059", () => {
  it("has Training and once per turn deletes an opposing level-four-or-lower Digimon on digivolving or attacking after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } }, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
  });
  it("inherits once-per-turn draw one and trash one when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { filter: { zone: "hand" } } }] }));
});
