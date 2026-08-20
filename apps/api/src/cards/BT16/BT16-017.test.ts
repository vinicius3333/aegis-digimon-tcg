import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-017.js";

describe("BT16-017", () => {
  it("once per turn gains memory when a different Free or green Digimon is played or digivolves", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] }));
  it("gains +2000 DP as an inherited your-turn effect", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] }));
});
