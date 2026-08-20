import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-028.js";

describe("EX9-028", () => {
  it("once per turn can digivolve at end of turn by placing three Ver.4 Digimon from trash face down underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand", "trash"], cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack", position: "bottom" } }] });
  });
  it("inherits -3000 DP for opposing Security Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { filter: { zone: "security" } } }] });
  });
});
