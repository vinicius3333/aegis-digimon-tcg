import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-073.js";

describe("BT2-073 Garurumon", () => {
  it("gains 1 memory when another own Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-074", as: "host", under: ["BT2-073"] }, { card: "BT2-068", as: "other" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q1026 gains only 1 memory when two other Digimon are deleted together", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-074", as: "host", under: ["BT2-073"] }, { card: "BT2-068", as: "first" }, { card: "BT2-070", as: "second" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([
      s.perm("first").permanentId,
      s.perm("second").permanentId,
    ]);
    expect(s.state.memory).toBe(1);
  });
});
