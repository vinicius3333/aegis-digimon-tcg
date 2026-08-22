import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-056.js";

describe("BT26-056 Cerberusmon: Werewolf Mode", () => {
  it("encodes the three keywords, Dark Animal rule trait, deletion play, TS waiver, and empty-hand-safe De-Digivolve Main", () => {
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Jamming" }), expect.objectContaining({ keyword: "Reboot" }), expect.objectContaining({ keyword: "Blocker" }),
    ]));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }] });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "Main", actions: [{ kind: "Trash", optional: true }, { kind: "DeDigivolve", amount: 3 }] });
  });
});
