import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-046.js";

describe("EX6-046 DemiDevimon", () => {
  it("draws and trashes from your hand when the opponent has five or fewer cards, or trashes their hand at seven or more", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions).toMatchObject([
      { kind: "Draw", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));

  it("publicly trashes one opponent hand card on deletion when their hand has seven cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-046", as: "demi" }] },
        1: { hand: Array.from({ length: 7 }, () => "BT1-010") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("demi").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
  });
  it("does not take either hand-size branch at the six-card boundary", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-046", as: "demi" }] },
      1: { hand: Array.from({ length: 6 }, () => "BT1-010") },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("demi").permanentId], "byEffect");
    await settle(() => false, 30);
    expect(s.state.players[1]!.hand).toHaveLength(6);
  });
});
