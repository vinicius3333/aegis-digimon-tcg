import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-039.js";

describe("EX5-039 Garudamon", () => {
  it("has Fortitude and suspends an opposing Digimon at or below its current DP on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Fortitude" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Suspend", target: { filter: { dp: { op: "lte", relativeToSource: true } } } });
  });
  it("inherits 1000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } });
  });
});
