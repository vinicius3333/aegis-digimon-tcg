import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-016.js";

describe("EX5-016 Lunamon", () => {
  it("gains two memory by optionally returning an own Digimon at the start of the main phase", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 2, optional: true, cost: { kind: "return", target: { filter: { controller: "mine", kind: ["Digimon"] } } } });
  });
  it("once per turn gains two memory by placing a traited top card at the bottom of its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 2, optional: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } });
  });
});
