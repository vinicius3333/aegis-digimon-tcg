import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-042.js";

describe("BT7-042 AncientKazemon", () => {
  it("gives only Security Digimon +4000 DP on the opponent's turn while it has a Hybrid source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-042", under: ["BT7-035"], as: "ancient" },
          { card: "BT6-034", as: "ally" },
        ],
      },
    });
    const ancientDP = s.perm("ancient").currentDP;
    const allyDP = s.perm("ally").currentDP;
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).securityDp(0)).toBe(4000);
    expect(s.perm("ancient").currentDP).toBe(ancientDP);
    expect(s.perm("ally").currentDP).toBe(allyDP);
  });

  it.each([
    { label: "its controller's turn", turnSeat: 0 as const, under: ["BT7-035"] },
    { label: "without a Hybrid source", turnSeat: 1 as const, under: ["BT6-034"] },
  ])("does not grant Security DP on $label", async ({ turnSeat, under }) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-042", under, as: "ancient" }] } });
    s.state.turnSeat = turnSeat;
    await s.ready();

    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("plays a yellow level 4 Hybrid from hand when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT7-042", as: "ancient" }], hand: [{ card: "BT7-035", as: "kazemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("kazemon").instanceId,
      ),
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
