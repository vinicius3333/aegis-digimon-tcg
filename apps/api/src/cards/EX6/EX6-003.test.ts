import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-003.js";

describe("EX6-003 Angewomon", () => {
  it("returns one security card to hand and places an Angel excluding Fallen Angel as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "toHand", amount: 1, toTop: true }, { kind: "SecurityManipulation", op: "placeAsSecurity", source: { filter: { excludeNameOrTrait: [{ match: "trait", tokens: ["Fallen Angel"] }] } }, toTop: false }] });
  });
});
