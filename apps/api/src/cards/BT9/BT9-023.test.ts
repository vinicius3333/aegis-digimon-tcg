import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-023.js";

describe("BT9-023 KausGammamon", () => {
  it("cannot be blocked during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-023", as: "kaus" }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("kaus"), "cantBeBlocked")).toBe(true);
  });
});
