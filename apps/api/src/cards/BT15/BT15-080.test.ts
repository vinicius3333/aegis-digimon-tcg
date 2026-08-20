import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-080.js";

describe("BT15-080", () => {
  it("deletes one opposing level 5 or lower Digimon on play and when digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });
  it("repeats the deletion on its own deletion", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } }] }));
});
