import { describe, expect, it } from "vitest";
import { compiled as BT25_003 } from "./BT25-003.js";
import "../index.js";

describe("BT25-003 Kekkomon", () => {
  it("may digivolve into a Glowing Dawn card by trashing the top security card", () => {
    const effect = BT25_003.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    const digivolve = effect?.actions?.[0] as { kind?: string; cost?: { target?: { filter?: unknown } } };
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      cost: { target: { filter: { controller: "mine", zone: "security", position: "top" } } },
    });
    expect(digivolve).toMatchObject({ reduceCost: 1, optional: true, from: ["hand"] });
  });
});
