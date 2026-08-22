import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-016.js";
import "../index.js";

describe("EX11-016 PolarBearmon", () => {
  it("grants an Ice-Snow host Piercing and Security Attack +1 when the opponent has no stacked Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-016"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
