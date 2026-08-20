import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-059.js";

describe("BT15-059", () => {
  it("may place Marvin Jackson under itself to de-digivolve an opposing Digimon to level 3", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, cost: { kind: "place" }, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 }] });
  });
  it("unsuspends itself as an inherited effect", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "Static", isInherited: true, actions: [{ kind: "Unsuspend", target: { isSelf: true } }] }));
});
