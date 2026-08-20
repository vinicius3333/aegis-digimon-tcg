import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-051.js";

describe("EX9-051", () => {
  it("has Training and de-digivolves an opposing Digimon by one on play and attack after placing a hand card underneath", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "DeDigivolve", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
  });
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
