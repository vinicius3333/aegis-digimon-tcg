import { describe, expect, it } from "vitest";
import { compiled as gabumon } from "./BT1-029.js";
import { compiled as gomamon } from "./BT1-030.js";
import { compiled as monmon } from "./BT1-031.js";
import { compiled as frigimon } from "./BT1-032.js";
import { compiled as leomon } from "./BT1-035.js";
import { compiled as garurumon } from "./BT1-036.js";
import { compiled as wereGarurumon } from "./BT1-040.js";
import { compiled as kudamon } from "./BT1-046.js";
import { compiled as seasarmon } from "./BT1-052.js";
import { compiled as chirinmon } from "./BT1-058.js";

describe("BT1-029 through BT1-058 IR coverage", () => {
  it("registers each migrated module with complete IR", () => {
    for (const card of [
      gabumon,
      gomamon,
      monmon,
      frigimon,
      leomon,
      garurumon,
      wereGarurumon,
      kudamon,
      seasarmon,
      chirinmon,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains keyword, trigger, boundary, and delayed-memory clauses", () => {
    expect(gabumon.effects[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Draw", amount: 1 }] });
    expect(gomamon.effects[0]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
    expect(monmon.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(frigimon.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(leomon.effects[0]?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 2 });
    expect(garurumon.effects[0]?.actions[0]).toMatchObject({ kind: "Unsuspend" });
    for (const card of [wereGarurumon, chirinmon])
      expect(card.effects[0]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: -3, at: "endOfTurn" });
    expect(kudamon.effects[0]?.actions[0]?.condition).toMatchObject({
      kind: "zoneCount",
      zone: "hand",
      op: "lte",
      value: 4,
    });
    expect(seasarmon.effects[0]).toMatchObject({ keywords: [{ keyword: "Jamming" }] });
  });
});
