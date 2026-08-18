import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST5-06.js";

describe("ST5-06 Greymon", () => {
  it("draws at the end of the opponent's turn if they did not attack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-08", under: ["ST5-06"], as: "host" }], deck: [{ card: "ST5-03", as: "drawn" }] } });
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});
