import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-038.js";

describe("BT14-038", () => {
  it("plays a level-six Etemon from hand from security when three Sukamon are in trash", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], condition: { kind: "youHave", count: 3 }, target: { filter: { levels: [6], nameOrTrait: [{ tokens: ["Etemon"], match: "name" }] } } }));
  it("inherits placing an Etemon from trash as security on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["trash"] }] }));
});
