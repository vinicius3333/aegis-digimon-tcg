import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-034.js";

describe("EX1-034 Palmon", () => {
  it("suspends an opposing Digimon with 5000 DP or less on deletion", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-034", as: "palmon" }] }, 1: { battleArea: [{ card: "BT1-070", as: "target", dp: 5000 }] } }, { autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("palmon").permanentId], "byEffect");
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
