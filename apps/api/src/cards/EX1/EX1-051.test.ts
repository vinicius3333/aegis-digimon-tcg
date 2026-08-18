import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-051.js";

describe("EX1-051 Infermon", () => {
  it("gains 1 memory when an opponent digivolves into level 5 or higher on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-051", as: "infermon" }] }, 1: { battleArea: [{ card: "EX1-050", as: "opponent" }] } });
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", { subjectPermanentId: s.perm("opponent").permanentId });
    expect(s.state.memory).toBe(4);
  });

  it("gives all other Digimon with the host's name +2000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX1-051"] }, { card: "BT1-009", as: "other", dp: 2000 }] } });
    await s.ready();
    expect(s.perm("other").currentDP).toBe(4000);
  });
});
