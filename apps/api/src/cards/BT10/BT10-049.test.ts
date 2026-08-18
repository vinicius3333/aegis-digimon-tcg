import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-049.js";

describe("BT10-049 Ballistamon", () => {
  it("gains Blocker on the opponent's turn while another Xros Heart permanent is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-049", as: "source" }, "BT10-087"] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
  });

  it("grants Piercing only while its host has Shoutmon in its name", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-049"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).hasPierce(matching.perm("host"))).toBe(true);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-049"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).hasPierce(other.perm("host"))).toBe(false);
  });
});
