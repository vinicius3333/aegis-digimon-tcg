import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-014.js";

describe("EX1-014 ExVeemon", () => {
  it("has Jamming as its main keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("exveemon"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming to a Free-trait host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming through the Imperialdramon name branch", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "imperial", under: ["EX1-014"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("imperial"), "Jamming")).toBe(true);
  });

  it("does not grant inherited Jamming outside your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }] }, 1: { battleArea: [{ card: "BT1-070" }] } });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(false);
  });
});
