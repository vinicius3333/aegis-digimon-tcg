import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-033.js";

describe("BT14-033", () => {
  it("searches security and may free-digivolve into a yellow Vaccine Digimon, then shuffles", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Search", filter: { zone: "security" } });
    expect(actions[1]).toMatchObject({ kind: "Digivolve", from: ["security"], faceDownSecurityOk: true, payCost: false, into: { filter: { colors: ["Yellow"], nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }] } } });
    expect(actions[2]).toMatchObject({ kind: "SecurityManipulation", op: "shuffle" });
    expect(actions[3]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", condition: { kind: "ifThisEffectDigivolved" } });
  });
  it("inherits once-per-turn memory when your security increases", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenAddSecurity", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
