import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-13.js";
import "./ST13-15.js";

describe("ST13-13 RaijiLudomon", () => {
  it("survives an opponent's deletion effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST13-13", as: "raiji" }] },
      1: { battleArea: ["ST13-05"], hand: [{ card: "ST13-15", as: "smasher" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("smasher").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("raiji").permanentId)).toBe(true);
  });
});
