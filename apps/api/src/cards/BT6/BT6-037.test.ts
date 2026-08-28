import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-037.js";

describe("BT6-037 Bulkmon", () => {
  it("gains Security Attack +1 while you have at least 3 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-037", as: "bulkmon" }], security: 3 } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("bulkmon"), "SecurityAttack")).toBe(1);
  });

  it("does not gain Security Attack +1 with fewer than three security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-037", as: "bulkmon" }], security: 2 } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("bulkmon"), "SecurityAttack")).toBe(0);
  });
});
