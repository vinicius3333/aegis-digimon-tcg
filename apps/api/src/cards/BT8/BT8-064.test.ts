import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-064.js";

describe("BT8-064 Greymon", () => {
  it("grants Blocker to its host on the opponent's turn while you have a red Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-067", as: "host", under: ["BT8-064"] }, "BT8-008"] } });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
