import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-010.js";

describe("BT24-010 Greymon", () => {
  it("grants Blocker and De-Digivolves one opponent Digimon on deletion", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")?.actions?.[0] as any;
    expect(deletion).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("retains inherited Raid and alternate requirements", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
  });
});
