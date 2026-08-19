import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-066.js";

describe("BT21-066 Arresterdramon", () => {
  it("plays Hunter/Hero Tamers and saves a qualifying Digimon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"] })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "WhenDigivolving" }));
    const deletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    const saveAction = deletion?.actions[0] as { target?: { orFilters?: Array<{ keywords?: string[] }> } };
    expect(saveAction.target?.orFilters).toEqual(
      expect.arrayContaining([expect.objectContaining({ keywords: ["Save"] })]),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: expect.anything(), amount: 2000, duration: "permanent" }],
      }),
    );
  });
});
