import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-037.js";

describe("BT6-037 Manticoremon", () => {
  it("gains Security Attack +1 while you have at least 3 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-037", as: "manticore" }], security: 3 } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("manticore"), "SecurityAttack")).toBe(1);
  });
});
