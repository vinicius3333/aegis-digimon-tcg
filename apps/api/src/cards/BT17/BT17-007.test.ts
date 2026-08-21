import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-007.js";

describe("BT17-007", () => {
  it("returns a Garurumon, Greymon, or Omnimon from trash with a Tai Tamer", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Return", to: "hand", condition: { kind: "youHave" }, target: { filter: { zone: "trash" } } }] });
  });

  it("can DNA digivolve at end of turn as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "EndOfYourTurn", isInherited: true, actions: [{ kind: "DnaDigivolve", payCost: true, optional: true, materials: [{ count: 1, filter: { isSelfRef: true } }, { count: 1, filter: { excludeSelf: true } }] }] });
  });
});
