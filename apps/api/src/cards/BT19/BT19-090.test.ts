import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-090.js";

describe("BT19-090 Meteor Rock Soul", () => {
  it("compiles the two Main choices and the optional Security play", () => {
    const card = runtimeCompiledCard("BT19-090");
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    const modal = card?.effects.find((entry) => entry.trigger === "Main")?.actions[0];
    expect(modal).toMatchObject({ kind: "Modal", choose: 1, options: [[{ kind: "PlayWithoutCost" }], [{ kind: "Attack", attackPlayer: true, mandatory: true, cost: { kind: "unsuspendNamed", targets: expect.any(Array) } }]] });
    const security = card?.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["underTamers"] }] });
  });
});
