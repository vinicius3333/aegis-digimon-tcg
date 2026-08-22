import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-010.js";

describe("EX10-010 BlackWarGreymon", () => {
  it("models ACE keywords, exact deletion boundary, and conditional immunity/DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Counter")).toMatchObject({ isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] });
    expect(compiled.effects?.filter((effect) => ["Static"].includes(effect.trigger))).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Raid" })] }),
      expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Reboot" })] }),
      expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
    ]));
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{
        kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 7 }, count: 1 },
      }] });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ actions: [
      { kind: "ModifyDP", amount: 3000, duration: "permanent", while: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } } },
      { kind: "GrantImmunity", immuneFrom: "opponentDigimonEffects", duration: "permanent", while: { kind: "opponentHas", filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } } } },
    ] });
  });
});
