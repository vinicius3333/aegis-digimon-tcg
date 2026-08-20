import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-011.js";

describe("EX7-011 MagnaKidmon", () => {
  it("deletes a 6000 DP or lower opposing Digimon by placing a Three Musketeers Option under itself on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } }, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self", target: { from: ["hand", "trash"] } } });
  });
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing"));
});
