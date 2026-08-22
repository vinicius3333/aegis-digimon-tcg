import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-045.js";

describe("BT26-045 GranKuwagamon", () => {
  it("encodes hand-size reduction, shared free play, and all three Your Turn keywords", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 4 }] });
    expect(compiled.effects?.slice(1, 4)).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "OnPlay", frequency: "OncePerTurn" }),
      expect.objectContaining({ trigger: "WhenDigivolving", sharedUseKey: "bt26-045-free-play" }),
      expect.objectContaining({ trigger: "WhenAttacking", sharedUseKey: "bt26-045-free-play" }),
    ]));
    expect(compiled.effects?.[4]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Alliance" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Piercing" } }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Vortex" } }),
    ]));
  });
});
