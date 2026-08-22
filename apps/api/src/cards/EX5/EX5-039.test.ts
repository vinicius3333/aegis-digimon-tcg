import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-039.js";

describe("EX5-039 Garudamon", () => {
  it("has Fortitude and suspends an opposing Digimon at or below its current DP on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
        count: 1,
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
        count: 1,
      },
    });
  });
  it("inherits 1000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });
});
