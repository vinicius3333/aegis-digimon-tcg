import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-014.js";

describe("BT15-014", () => {
  it("plays a red Tamer costing 4 or less on play and when digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
  });
  it("once per turn deletes an opposing Digimon when your red Tamer is played", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Delete" }] }] }));
});
