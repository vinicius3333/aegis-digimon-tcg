import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-070.js";

describe("EX11-070 Unchained", () => {
  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-070", as: "unchained" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("unchained"));
    expect(s.state.memory).toBe(3);
  });
});
