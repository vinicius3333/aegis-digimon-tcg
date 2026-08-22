import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-025.js";
import "../index.js";
describe("BT26-025 Liollmon", () => {
  it("compiles On Play and On Move security placement followed by Recovery +1", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlaceUnder", from: ["security"], faceDown: true }, { kind: "SecurityManipulation", op: "addTop", source: "deck" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "OnMove" });
  });
  it("compiles inherited once-per-turn security-to-hand and zero-security recovery", () => {
    expect(compiled.effects[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SecurityManipulation", op: "toHand" }, { kind: "SecurityManipulation", op: "addTop", condition: { kind: "securityAtMost", value: 0 } }] });
  });
});
