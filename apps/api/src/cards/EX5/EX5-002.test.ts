import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-002.js";

describe("EX5-002 Moonmon", () => {
  it("once per turn may digivolve itself when a Light Fang or Night Claw Tamer is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { kind: ["Tamer"], nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Light Fang"] }] }, actions: [{ kind: "Digivolve", from: ["hand"], optional: true }] }] });
  });
});
