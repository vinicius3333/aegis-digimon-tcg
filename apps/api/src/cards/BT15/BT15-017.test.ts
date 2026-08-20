import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-017.js";

describe("BT15-017", () => {
  it("deletes the lowest DP opposing Digimon or trashes security based on security count", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 3 } }, { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "zoneCount", op: "gte", value: 4 } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Delete" }, { kind: "SecurityManipulation" }] });
  });
  it("plays a red Digimon or Tamer with 5000 DP or less when digivolving", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }] }));
});
