import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-049.js";

describe("BT16-049", () => {
  it("gains memory when your Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }, { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" }] });
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "anyOf" } }] });
  });

  it("gives itself inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
