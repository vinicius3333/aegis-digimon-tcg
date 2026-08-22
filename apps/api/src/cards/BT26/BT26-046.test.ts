import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-046.js";

describe("BT26-046 Gryphonmon", () => {
  it("encodes printed Piercing/Vortex, suspended-Digimon cost reduction, and Q7039 independent targets", () => {
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Piercing" }), expect.objectContaining({ keyword: "Vortex" }),
    ]));
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", actions: [{ kind: "Replacement", mode: "reduceCost", amount: 4 }] });
    expect(compiled.effects?.[2]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend" }), expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }), expect.objectContaining({ kind: "Restrict", restriction: "beDeletedInBattle" }),
    ]));
  });
});
