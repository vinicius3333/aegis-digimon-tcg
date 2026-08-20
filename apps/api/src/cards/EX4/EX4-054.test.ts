import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-054.js";

describe("EX4-054 Wendigomon", () => {
  it("adds a suspended Digimon's DP and Security Attack plus one for the attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ isInherited: true, actions: [{ kind: "AddDPFromSuspendedCost", dpSource: { kind: "suspendedTarget" }, alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }] }] });
  });
  it("returns a green Digimon from trash once per turn when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "trash", colors: ["Green"] } }, condition: { kind: "youHave", filter: { excludeSelf: true, suspended: true } } }] });
  });
});
