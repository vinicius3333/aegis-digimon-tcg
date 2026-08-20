import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-008.js";

describe("BT16-008", () => {
  it("has Jamming and deletes a 3000 DP or lower opposing Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Jamming" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 3000 } } } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });
  it("once per turn suspends an opposing Digimon when attacking", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] }));
});
