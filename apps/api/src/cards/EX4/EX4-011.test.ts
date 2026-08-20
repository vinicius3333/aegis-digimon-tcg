import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-011.js";

describe("EX4-011 ChaosGallantmon", () => {
  it("can be played from trash at end of turn by deleting a Gallantmon Digimon with digivolution cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({ isFromTrash: true, actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true, abortOnDecline: true, cost: { kind: "deleteOwn", target: { filter: { digivolutionCards: "hasAny", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Gallantmon"] }] } } } }] });
  });
  it("uses a combined-trash DP ceiling starting at 7000 and adding 2000 per ten cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Delete", dpCeiling: 7000, dpCeilingScaling: { per: 10, amount: 2000, unit: "cards", filter: { zone: "trash", controllerDefault: "both" } } });
  });
});
