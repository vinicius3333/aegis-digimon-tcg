import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT17-011–020 audit regressions", () => {
  it("BT17-017 deletes only an opponent Digimon at or below its DP", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT17-017", as: "ancient" }] },
      1: {
        battleArea: [
          { card: "BT1-009", dp: 10000, as: "within" },
          { card: "BT1-020", dp: 13000, as: "above" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 20;
    const withinId = s.perm("within").topCard!.instanceId;
    const aboveId = s.perm("above").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ancient").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === withinId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === aboveId)).toBe(true);
  });

  it("BT17-020's reveal selects only Tamers with inherited effects", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT17-020", as: "strabimon" }],
        deck: [
          { card: "BT7-008", as: "hybrid" },
          { card: "BT17-079", as: "inheritedTamer" },
          { card: "BT1-085", as: "plainTamer" },
        ],
      },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("strabimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("inheritedTamer").instanceId));
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("hybrid").instanceId);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).not.toContain(s.inst("plainTamer").instanceId);
  });
});
