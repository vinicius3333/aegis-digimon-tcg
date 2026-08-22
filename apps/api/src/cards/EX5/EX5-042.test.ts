import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-042.js";

describe("EX5-042 Merukimon", () => {
  it("has Fortitude and reveals one level five or lower Fortitude Digimon to play on play/digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "hand",
      add: [
        {
          count: 1,
          to: "play",
          filter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 5 },
            keywords: ["Fortitude"],
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 1,
      rest: "hand",
      add: [{ to: "play", filter: { levelComparison: { op: "lte", value: 5 }, keywords: ["Fortitude"] } }],
    });
  });
  it("grants Rush to all own Fortitude Digimon without digivolution cards on your turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      duration: "permanent",
      keyword: { keyword: "Rush" },
      target: {
        count: "all",
        filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "none", keywords: ["Fortitude"] },
      },
    });
  });
});
