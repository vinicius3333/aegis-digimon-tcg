import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-071.js";

describe("BT16-071", () => {
  it("may digivolve itself into a Leomon from hand or trash while attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Digivolve", from: ["hand", "trash"], optional: true, into: { nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] } }] });
  });

  it("plays a level 4 or lower Digimon from trash by deleting itself as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfAttack", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, abortOnDecline: true, cost: { kind: "deleteOwn" } }] });
  });
});
