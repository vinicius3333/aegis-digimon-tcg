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

  it("publicly plays DemiDevimon, pays its play cost, then draws and trashes exact cards on deletion at five", async () => {
    const s = setupEngine(
      {
        0: { deck: ["BT1-010"], hand: [{ card: "EX6-046", as: "demi" }, "BT1-011"] },
        1: { hand: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demi").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("demi") !== undefined);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("demi").instanceId)).toBe(false);
    await advance(s.engine).verb.deletePermanent([s.perm("demi").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX6-046", "BT1-011"]);
    expect(s.state.players[1]!.hand).toHaveLength(5);
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

  it("trashes exactly one opponent hand card at seven cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-046", as: "demi" }], hand: [{ card: "BT1-010", as: "ownerCard" }] },
        1: {
          hand: [
            { card: "BT1-011", as: "discarded" },
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-015",
            "BT1-016",
            "BT1-017",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("demi").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ownerCard").instanceId)).toBe(true);
  });
});
