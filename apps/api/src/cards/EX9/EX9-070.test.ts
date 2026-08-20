import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-070.js";

describe("EX9-070", () => {
  it("waives its color requirement while a DM Digimon or Tamer is present", () => expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave" } }] }));
  it("has the draw-and-enter main effect", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toEqual([{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]));
  it("can digivolve a DM Digimon by two after placing a hand card underneath", () => expect(compiled.effects?.filter((entry) => entry.trigger === "Main")[1]).toMatchObject({ actions: [{ kind: "Digivolve", reduceCost: 2, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] }));
  it("draws and enters the battle area from security", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }] }));
});
