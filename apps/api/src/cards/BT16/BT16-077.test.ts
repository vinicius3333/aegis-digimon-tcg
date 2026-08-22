import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-077.js";

describe("BT16-077", () => {
  it("models Raid and Partition", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Raid" }, { keyword: "Partition" }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Partition" }],
    });
  });

  it("during DNA digivolution plays a Free level 5 or lower from trash and grants Rush", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "isDnaDigivolving" },
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SelectBind",
      target: { bindAs: "rushAttacker" },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      optional: false,
      target: { fromSelectionRef: "rushAttacker" },
    });
    expect(compiled.effects?.[1]?.actions?.[3]).toMatchObject({
      kind: "Attack",
      target: { fromSelectionRef: "rushAttacker" },
      attackPlayer: true,
      withoutSuspending: false,
    });
  });
});
