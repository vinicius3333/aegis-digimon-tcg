import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-028.js";

describe("BT16-028", () => {
  it("restricts an opposing Digimon or Tamer and unsuspends yours", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "Unsuspend", optional: true, abortOnDecline: true, cost: { kind: "suspend" } });
  });

  it("can DNA digivolve into Imperialdramon: Fighter Mode when an opponent's effect plays or digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true }] });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
});
