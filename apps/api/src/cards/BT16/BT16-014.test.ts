import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-014.js";

describe("BT16-014", () => {
  it("has Raid and may play God Flame or a Four Great Dragons Option on digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }] });
  });
  it("grants Goldramon-related effects on all turns", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: "effects" }] }));
});
