import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-049.js";

describe("EX9-049", () => {
  it("once per turn digivolves at end of turn by placing three Ver.3 Digimon from trash underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand", "trash"], into: { nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] }, cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" } }] }));
  it("requires all three cards and places them face down at the bottom of this stack", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
    optional: true,
    abortOnDecline: true,
    cost: {
      kind: "place",
      target: { count: 3, from: ["trash"], filter: { kind: ["Digimon"], zone: "trash", nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] } },
      destination: "digivolutionStack",
      position: "bottom",
      host: "self",
      faceDown: true,
    },
  }));
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));
});
