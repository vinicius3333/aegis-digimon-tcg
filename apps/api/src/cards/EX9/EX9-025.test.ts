import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-025.js";

describe("EX9-025", () => {
  it("has Training and once per turn may give an opposing Digimon -2000 DP by placing the deck's top card face-down underneath when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", optional: true, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
  });
  it("inherits Barrier", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Barrier", raw: "＜Barrier＞" }));
});
