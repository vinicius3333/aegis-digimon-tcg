import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-049.js";

describe("BT14-049", () => {
  it("has Blast Digivolve and suspends then optionally returns an opposing suspended 5000-DP-or-lower Digimon to deck bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Return", to: "deckBottom", optional: true, target: { filter: { suspended: true, dp: { op: "lte", value: 5000 } } } }] });
  });
});
