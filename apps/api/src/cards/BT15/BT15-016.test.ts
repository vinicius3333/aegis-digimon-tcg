import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-016.js";

describe("BT15-016", () => {
  it("restricts an opposing 8000+ DP Digimon or deletes one at 6000 DP or less based on memory", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Restrict", restriction: "attack", condition: { kind: "memoryAtMost", value: 4 } }, { kind: "Delete", condition: { kind: "memoryAtLeast", value: 4 } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Restrict" }, { kind: "Delete" }] });
  });
  it("returns an opposing Digimon with 7000 DP or less on deletion", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "Return", to: "hand", target: { filter: { dp: { op: "lte", value: 7000 } } } }] }));
});
