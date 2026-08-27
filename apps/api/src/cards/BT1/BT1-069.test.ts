import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-069.js";

describe("BT1-069 Ogremon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-069", as: "digimon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Jamming")).toBe(true);
  });

  it("does not grant Jamming while it is a digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-081", as: "host", under: ["BT1-069"] }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });
});
