import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-049.js";

describe("BT9-049 Kuwagamon (X Antibody)", () => {
  it("grants Piercing only while its host has the Insectoid trait", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT9-052", as: "insectoid", under: ["BT9-049"] },
      { card: "BT1-028", as: "other", under: ["BT9-049"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("insectoid"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("other"))).toBe(false);
  });
});
