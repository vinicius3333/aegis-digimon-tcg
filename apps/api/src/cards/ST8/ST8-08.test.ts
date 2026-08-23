import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-08.js";

describe("ST8-08 AeroVeedramon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST8-08", as: "aero" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Jamming")).toBe(true);
  });

  it("gives its host Security Attack +1 on your turn with 8 cards in hand", async () => {
    const s = setupEngine({
      0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-10", as: "host", under: ["ST8-08"] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
