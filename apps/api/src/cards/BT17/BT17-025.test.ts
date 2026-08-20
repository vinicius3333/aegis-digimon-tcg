import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-025.js";

describe("BT17-025", () => {
  it("plays a level 3 blue or purple Digimon from trash or digivolution cards and returns itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["trash", "digivolutionCards"], payCost: false, optional: true }, { kind: "SubTrigger", event: "endOfOpponentTurn", actions: [{ kind: "Return", to: "hand" }] }] });
  });

  it("grants itself Dark Animal and returns a level 3 opponent Digimon when yours is played", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Dark Animal"] }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Return", to: "hand", target: { filter: { levels: [3] } } }] }] });
  });
});
