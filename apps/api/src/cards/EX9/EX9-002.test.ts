import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-002.js";

describe("EX9-002", () => {
  it("inherits a once-per-turn Ver.2 digivolution after adding digivolution cards", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] }] }));
});
