import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST12-09.js";

describe("ST12-09 Volcanomon", () => {
  it("has Blocker and grants Security Attack +1 as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-09", as: "volcano" }, { card: "ST12-10", as: "host", under: ["ST12-09"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("volcano"), "Blocker")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
