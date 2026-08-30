import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT7-033.js";

describe("BT7-033 Bulkmon", () => {
  it("grants Blocker to its host on the opponent's turn while its owner has at least 3 security cards", async () => {
    // Legal yellow stack: L2 egg -> L3 Pulsemon -> L4 Bulkmon -> L5 Sirenmon.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", under: ["BT1-005", "BT7-032", "BT7-033"], as: "host" }], security: 3 },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("does not grant Blocker below the 3-security threshold", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", under: ["BT1-005", "BT7-032", "BT7-033"], as: "host" }], security: 2 },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
  });
});
