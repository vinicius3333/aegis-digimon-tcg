import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT12-079 Jokermon", () => {
  it("has no printed effects and keeps its card definition", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT12-079", as: "joker" }] } });
    expect(s.inst("joker").cardId).toBe("BT12-079");
  });
});
