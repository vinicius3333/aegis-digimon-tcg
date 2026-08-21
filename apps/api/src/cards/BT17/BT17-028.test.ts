import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-028.js";

describe("BT17-028", () => {
  it("registers lowest-level return, security-to-hand, and deletion effects", () => {
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects?.map((effect) => effect.trigger)).toEqual(["OnPlay", "WhenDigivolving", "YourTurn", "OnDeletion"]);
  });
});
