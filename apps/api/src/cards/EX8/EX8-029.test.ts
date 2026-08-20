import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-029.js";

describe("EX8-029", () => {
  it("returns opposing Digimon up to total play cost 14 and plays DS cards from digivolution cards when DNA digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Return", to: "deckBottom", target: { totalPlayCostBudget: 14, upTo: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({ kind: "PlayMultiple", totalCost: 12, from: ["digivolutionCards"], condition: { kind: "isDnaDigivolving" } });
  });
  it("grants DS immunity with memory and restricts opposing On Play effects at low memory, plus Aquatic", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([{ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "memoryAtLeast", value: 1 } }, { kind: "Aura", while: { kind: "memoryAtMost", value: 1 } }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Aquatic"] });
  });
});
