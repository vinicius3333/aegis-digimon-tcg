import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-072.js";

describe("EX9-072", () => {
  it("waives color requirements when there are no face-up security cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }] }));
  it("gives own DM Digimon +1000 DP per digivolution card from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ isSecurity: true, actions: [{ kind: "ModifyDP", amount: 1000, scaling: { unit: "digivolutionCards", per: 1 } }] }));
  it("trades a security card to place this card as security and plays a DM Digimon from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([{ kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: false }, { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", source: { filter: { isSelfRef: true }, count: 1, isSelf: true }, toTop: false }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, target: { filter: { playCostLte: 5 } } }] });
  });
});
