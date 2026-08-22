import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-08.js";

describe("ST2-08 WereGarurumon", () => {
  it("gives its host Security Attack +1 while the opponent has a Digimon without sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] }, 1: { battleArea: ["ST1-03"] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });

  it("does not grant Security Attack +1 while every opposing Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "host", under: ["ST2-08"] }] },
      1: { battleArea: [{ card: "ST1-03", under: ["ST1-04"] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
