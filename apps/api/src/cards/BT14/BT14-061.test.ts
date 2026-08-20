import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-061.js";

describe("BT14-061", () => {
  it("gains one memory on play or digivolution by returning an opponent Digimon from trash to deck top", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, cost: { kind: "return", target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } } } });
  });
});
