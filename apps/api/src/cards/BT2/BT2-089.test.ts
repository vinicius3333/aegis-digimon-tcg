import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-089.js";

describe("BT2-089 Tai Kamiya", () => {
  it("sets memory to 3 at turn start and gives black Digimon +1000 DP on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-089", as: "tai" }, { card: "BT2-063", as: "black" }] } });
    s.state.memory = 1;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tai"));
    expect(s.state.memory).toBe(3);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("black").currentDP).toBe(s.perm("black").baseDP + 1000);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-089", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });
});
