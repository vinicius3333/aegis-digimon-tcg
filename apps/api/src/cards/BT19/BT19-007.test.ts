import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-007 Guilmon", () => {
  it("gains memory when Takato is present at the start of the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-007", as: "guilmon" }, { card: "BT19-080", as: "takato" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("guilmon"));

    expect(s.state.memory).toBe(1);
  });
});
