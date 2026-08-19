import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-071.js";
describe("BT21-071 Scopemon", () => {
  it("gains memory after placing an Appmon or Three Musketeers card", () => {
    for (const e of compiled.effects)
      expect(e.actions[0]).toMatchObject({
        kind: "GainMemory",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "place" },
      });
  });
});
