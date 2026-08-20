import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-056.js";

describe("EX9-056", () => {
  it("has Blast Digivolve and places an opposing 8000-DP-or-lower Digimon at the bottom of security on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0];
      expect(action).toMatchObject({ kind: "Trash", cost: { kind: "place", destination: "security", position: "bottom", faceDown: true } });
      expect(action?.cost?.target?.filter).toMatchObject({ dp: { op: "lte", value: 8000 } });
    }
  });
  it("once per turn prevents a Ver.3 Digimon from leaving by trashing top security", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", cost: { kind: "trashSecurityTop" } }] }));
});
