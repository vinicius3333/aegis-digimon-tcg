import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-016.js";

describe("BT8-016 MasterTyrannomon", () => {
  it("grants Security Attack +1 to every Tyrannomon during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-016", as: "master" }, { card: "BT2-044", as: "tyrannomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("master"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("tyrannomon"), "SecurityAttack")).toBe(true);
  });

  it("grants Security Attack +1 as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-016"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(true);
  });
});
