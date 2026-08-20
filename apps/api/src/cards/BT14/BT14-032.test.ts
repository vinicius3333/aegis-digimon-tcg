import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-032.js";

describe("BT14-032", () => {
  it("on play returns a security card to hand and may place a Sukamon from hand as security", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "placeAsSecurity", source: { filter: { nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] } } }] }));
  it("inherits -3000 DP to an opposing Digimon on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }] }));
});
