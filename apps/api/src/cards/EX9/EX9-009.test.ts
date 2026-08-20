import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-009.js";

describe("EX9-009", () => {
  it("has Training and once per turn may gain +1000 DP by placing the deck's top card face-down underneath when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: 1000, duration: "untilOpponentTurnEnd", optional: true, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } }] });
  });
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
