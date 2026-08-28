import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-099.js";

describe("BT15-099", () => {
  it("stores the trashed Digimon level for the deletion cap and draws for Myotismon text", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{
        kind: "CostGatedBlock",
        cost: { kind: "trash", storeAs: "trashedDigimonLevel" },
        actions: [
          { kind: "Delete", target: { filter: { levelLte: "trashedDigimonLevel" } } },
          { kind: "Draw", amount: 2, condition: { kind: "lastTrashedMatchesFilter" } },
        ],
      }],
    });
  });
  it("runs the same body from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true }));

  it("naturally uses the trashed Myotismon level as the deletion cap and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-068", as: "source" }],
          hand: [{ card: "BT15-099", as: "option" }, { card: "BT15-076", as: "cost" }],
          deck: ["BT15-007", "BT15-008"],
        },
        1: { battleArea: [{ card: "BT15-072", as: "eligible" }, { card: "BT15-079", as: "tooHigh" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("eligible").permanentId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("eligible").permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("tooHigh").permanentId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT15-007", "BT15-008"]);
  });
});
