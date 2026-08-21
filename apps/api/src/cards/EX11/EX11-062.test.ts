import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-062.js";

describe("EX11-062 Shoto Kazama", () => {
  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-062", as: "shoto" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("shoto"));
    expect(s.state.memory).toBe(3);
  });
});
