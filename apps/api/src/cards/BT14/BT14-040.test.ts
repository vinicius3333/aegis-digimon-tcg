import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-040.js";

describe("BT14-040", () => {
  it("may place a Tamer from hand as the top security card on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "SecurityManipulation", op: "placeAsSecurity", from: ["hand"], toTop: true, source: { filter: { kind: ["Tamer"] } } });
  });
  it("once per turn plays a level-three Digimon from hand when a Tamer is played", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { kind: ["Tamer"] }, actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, target: { filter: { levels: [3] } } }] }] }));
});
