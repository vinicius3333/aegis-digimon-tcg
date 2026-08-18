import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-066.js";

describe("BT8-066 Hisyaryumon", () => {
  it("gives Reboot to an X-Antibody host on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-069", as: "host", under: ["BT8-066"], suspended: true }] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
