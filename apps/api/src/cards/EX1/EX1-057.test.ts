import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-057.js";

describe("EX1-057 Wizardmon", () => {
  it("has Retaliation and inherited grants Rush to all of your Retaliation Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-057", as: "wizardmon" }, { card: "EX1-060", as: "host", under: ["EX1-057"] }, { card: "EX1-056", as: "recipient" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Rush")).toBe(true);
  });
});
