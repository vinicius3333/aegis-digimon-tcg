import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-007.js";

describe("BT16-007", () => {
  it("once per turn gains memory when a different Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] });
  });
  it("once per turn suspends an opposing Digimon when attacking", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] }));
});
