import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-073.js";

describe("BT15-073", () => {
  it("draws one and trashes one hand card on main, digivolving, or deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1, filter: { zone: "hand" } } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }] });
  });
  it("deletes the battled opponent when the inherited effect fires after a battle deletion", () => {
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "Delete", target: { sourceRef: "battleOpponent" } }],
    });
  });
});
