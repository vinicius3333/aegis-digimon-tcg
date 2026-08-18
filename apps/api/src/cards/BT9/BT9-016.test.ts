import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-016.js";

describe("BT9-016 WarGreymon (X Antibody)", () => {
  it("gains 1 memory whenever a card is removed from the opponent's security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-016", as: "war" }] } });
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(1);
  });

  it("once per turn deletes an opponent no larger than itself at end of attack with a required source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-016", as: "war", under: ["BT9-109"] }] }, 1: { battleArea: [{ card: "BT9-056", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("war"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
