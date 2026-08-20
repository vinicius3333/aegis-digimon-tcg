import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-052.js";

describe("EX9-052", () => {
  it("once per turn digivolves at end of turn by placing three Ver.5 Digimon from trash underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand", "trash"], into: { nameOrTrait: [{ tokens: ["Ver.5"], match: "trait" }] }, cost: { kind: "place", target: { count: 3 }, faceDown: true, destination: "digivolutionStack" } }] }));
  it("inherits de-digivolve one on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "DeDigivolve", amount: 1 }] }));
});
