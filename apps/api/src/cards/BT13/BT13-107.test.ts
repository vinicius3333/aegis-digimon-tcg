import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-107.js";

describe("BT13-107 Vulcan Crusher", () => {
  it("returns one suspended opposing Digimon whose DP is at most the chosen own Digimon's DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[0]).toMatchObject({
      kind: "Return", to: "hand", target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"], dp: { lte: { kind: "dpOfChosen", chosenBy: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } } } }, count: 1 },
    });
  });

  it("requires returning a Leopardmon: Leopard Mode top card before unsuspending all own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1]).toMatchObject({ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" }, cost: { kind: "return", target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Leopardmon: Leopard Mode"] }] }, count: 1 } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions?.map((action) => action.kind)).toEqual(["Suspend", "AddToHandSelf"]);
  });
});
