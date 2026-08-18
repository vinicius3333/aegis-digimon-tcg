import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-003.js";

describe("BT9-003 Tokomon (X Antibody)", () => {
  it("once per turn gives an opponent -1000 DP when a card is added to its controller's security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 0 });
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
