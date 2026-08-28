import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-065.js";

describe("EX7-065", () => {
  it("gains 1 memory when the opponent has a Digimon and can digivolve from trash by suspending itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      optional: true,
      cost: { kind: "suspend" },
      condition: { kind: "zoneCount", value: 4 },
    });
  });
  it("plays itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));
});
