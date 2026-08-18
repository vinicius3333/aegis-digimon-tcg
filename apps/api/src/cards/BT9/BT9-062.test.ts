import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-062.js";

describe("BT9-062 Raptordramon", () => {
  it("deletes a play-cost-5-or-less Digimon at end of attack while hosted by Alphamon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-066", as: "alphamon", under: ["BT9-062"] }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("alphamon"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
