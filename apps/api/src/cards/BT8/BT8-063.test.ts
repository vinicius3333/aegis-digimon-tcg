import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-063.js";

describe("BT8-063 Ginryumon", () => {
  it("grants Blocker to an X-Antibody host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-066", as: "host", under: ["BT8-063"] }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
