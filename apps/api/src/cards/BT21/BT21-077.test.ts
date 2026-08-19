import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-077.js";
describe("BT21-077 Regulusmon", () => {
  it("costs a Gammamon card to grant Collision and recurs on deletion", () => {
    const action = compiled.effects.find((e) => e.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Collision" }, cost: { kind: "trash" } });
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
  });
});
