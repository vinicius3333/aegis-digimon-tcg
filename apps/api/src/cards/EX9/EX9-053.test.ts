import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-053.js";

describe("EX9-053", () => {
  it("has Collision and reveals three to play one DM Digimon or Tamer with scaled play-cost limit", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Collision"))?.keywords).toContainEqual({ keyword: "Collision", raw: "＜Collision＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ to: "play", optional: true, filter: { playCostLte: 4, playCostLteScaling: { per: 1, unit: "selfFaceDownDigivolutionCards" } } }] });
  });
  it("inherits once-per-turn de-digivolve one when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "DeDigivolve", amount: 1 }] }));
});
