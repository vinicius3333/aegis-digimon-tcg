import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-067.js";

describe("EX8-067", () => {
  it("sets memory to 3 at the start of your turn when it is 2 or less", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    }));
  it("places up to 2 Mineral/Rock cards from trash under a Mineral/Rock Digimon by suspending itself when one digivolves", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      actions: [{ kind: "PlaceUnder", optional: true, cost: { kind: "suspend" } }],
    }));
  it("contains only the printed effects", () => expect(compiled.effects).toHaveLength(2));
});
