import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-018.js";

describe("BT14-018", () => {
  it("plays one Amon or Umon token on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "PlayToken", count: 1, payCost: false });
  });
  it("deletes its tokens instead of leaving or digivolving and gains Recovery +1 when a token is deleted", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldLeavePlay" }, { kind: "Replacement", event: "wouldDigivolve" }, { kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainKeyword", keyword: { keyword: "Recovery" } }] }] }));
});
