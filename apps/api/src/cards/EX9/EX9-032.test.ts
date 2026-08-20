import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-032.js";

describe("EX9-032", () => {
  it("plays a Puppet Digimon from hand by deleting an own Token or other Puppet", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, cost: { kind: "deleteOwn" } }] });
  });
  it("inherits once-per-turn leaving-play prevention with the same deletion cost", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanYourEffect", cost: { kind: "deleteOwn" } }] }));
});
