import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-075.js";

describe("BT8-075 Kogamon", () => {
  it("grants Retaliation as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-079", as: "host", under: ["BT8-075"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
  });
});
