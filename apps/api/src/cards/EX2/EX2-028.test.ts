import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-028.js";

describe("EX2-028 Parasitemon", () => {
  it("gives its host +2000 DP and Security Attack +1 during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-028"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(15000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
