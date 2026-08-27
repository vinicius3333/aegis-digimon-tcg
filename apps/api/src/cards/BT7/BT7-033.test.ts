import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-033.js";

describe("BT7-033 Bulkmon", () => {
  it("grants Blocker to its host on the opponent's turn while its owner has at least 3 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-034", under: ["BT7-033"], as: "host" }], security: 3 } });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
