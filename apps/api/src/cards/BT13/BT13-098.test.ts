import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-098.js";

describe("BT13-098 Richard Sampson", () => {
  it("plays itself when an effect directly trashes it from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDiscardSecurity")?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true, payCost: false, target: { filter: { isSelfRef: true }, isSelf: true } });
  });

  it("uses the total security count for both memory and Main conditions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({ kind: "Digivolve", ignoreRequirements: true, from: ["hand"], target: { filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Kudamon"] }] } }, into: { nameOrTrait: [{ match: "name", tokens: ["Kentaurosmon"] }] }, cost: { kind: "suspend" }, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });
});
