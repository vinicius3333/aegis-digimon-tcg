import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-084.js";

describe("BT14-084", () => {
  it("may return the top security card to place a yellow Vaccine card from hand as security", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], cost: { kind: "return" }, source: { filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } } }));
  it("plays itself from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
});
