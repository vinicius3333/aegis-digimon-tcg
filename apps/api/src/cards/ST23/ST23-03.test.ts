import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST23-03.js";

describe("ST23-03 Cougarmon", () => {
  it("uses the shared printed under-Tamer cost for its turn reduction", () => {
    const effect = runtimeCompiledCard("ST23-03")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      actions: [{
        kind: "Replacement",
        event: "wouldDigivolve",
        amount: 2,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
      }],
    });
  });
});
