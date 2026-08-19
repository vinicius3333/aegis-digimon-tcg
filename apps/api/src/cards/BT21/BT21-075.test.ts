import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-075.js";
describe("BT21-075 SkullGreymon", () => {
  it("grants Raid and Retaliation and recurs ADVENTURE", () => {
    for (const t of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((e) => e.trigger === t)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Raid" } });
      expect(actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Retaliation" } });
    }
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
  });
});
