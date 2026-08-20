import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-039.js";

describe("EX9-039", () => {
  it("has Training and suspends an opposing Digimon on play or digivolution, then may attack", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "PlaceUnder", optional: true }, { kind: "Suspend", scaling: { unit: "digivolutionCards", per: 1 } }, { kind: "Attack", optional: true }] });
  });
  it("inherits suspension of an opposing Digimon or Tamer on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } }] }));
});
