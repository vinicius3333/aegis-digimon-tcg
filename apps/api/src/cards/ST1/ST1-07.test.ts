import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./ST1-07.js";

describe("ST1-07 Greymon", () => {
  it("registers complete inherited Security Attack IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "Static", isInherited: true, keywords: [{ keyword: "SecurityAttack", amount: 1 }] }],
    });
  });

  it("gives its host Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST1-08", as: "host", under: ["ST1-07"] }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant its inherited effect while it is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST1-07", as: "greymon" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("greymon"), "SecurityAttack")).toBe(0);
  });
});
