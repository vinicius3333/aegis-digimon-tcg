import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { compiled } from "./BT26-051.js";

describe("BT26-051 Gomimon", () => {
  it("encodes Detach and the Your Turn linked grant plus linked-face De-Digivolve", () => {
    expect(digivolutionRequirementsFor("BT26-051")).toContainEqual({ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([expect.objectContaining({ keyword: "Detach" })]));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision" } }, { kind: "ModifyDP", amount: 3000 }] }] });
    expect(compiled.effects?.[2]).toMatchObject({ isLinked: true, actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "DeDigivolve", amount: 2 }] }] });
  });
});
