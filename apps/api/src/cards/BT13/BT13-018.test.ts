import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-018.js";

describe("BT13-018 ShineGreymon", () => {
  it("turns Marcus Damon into a temporary Blocker Digimon and debuffs on suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "StartOfYourMainPhase" });
    expect(compiled.effects[0]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "GrantStatic", grant: "kind" }),
      expect.objectContaining({ kind: "RestrictDigivolveInto" }),
      expect.objectContaining({ kind: "GainKeyword", keyword: expect.objectContaining({ keyword: "Blocker" }) }),
    ]));
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
  });
});
