import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-064.js";

describe("BT15-064", () => {
  it("reveals three to place one Machine/Cyborg/SoC under itself and add another to hand", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "trash", add: [{ to: "placeUnder" }, { to: "hand" }] }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd" }] });
  });
  it("deletes a low-cost opposing card with SoC in stack and inherited de-digivolves", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", actions: [{ kind: "Delete", condition: { kind: "selfDigivolutionStackHasTrait" } }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "DeDigivolve", stopAtLevel: 3 }] });
  });
});
