import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-016.js";

describe("EX5-016 Lunamon", () => {
  it("gains two memory by optionally returning an own Digimon at the start of the main phase", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 2,
      cost: { kind: "return", target: { filter: { controller: "mine", kind: ["Digimon"] } } },
    });
    expect(action).not.toHaveProperty("optional");
  });
  it("once per turn gains two memory by placing a traited top card at the bottom of its stack", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 2,
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
    });
    expect(action).not.toHaveProperty("optional");
  });
});
