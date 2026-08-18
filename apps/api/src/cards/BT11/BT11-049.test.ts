import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT11-049.js";

describe("BT11-049 Vegiemon", () => {
  it("gains 1 memory at the start of its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-049", as: "vegiemon" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("vegiemon"));

    expect(s.state.memory).toBe(1);
  });
});
