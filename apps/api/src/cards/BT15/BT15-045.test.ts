import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-045.js";

describe("BT15-045", () => {
  it("suspends an opposing Digimon on play and when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] });
  });
  it("gains 1 memory once per turn when a green Tamer is played", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
