import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-015.js";

describe("BT7-015 AvengeKidmon", () => {
  it("Q1517 reduces its play cost for Option cards in both players' trashes", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT7-015", as: "source" }], trash: ["BT7-092"] },
      1: { trash: ["BT7-093"] },
    });
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("source").instanceId));

    expect(s.state.memory).toBe(2);
  });

  it("returns seven qualifying trash cards and deletes an eligible opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT7-015", as: "source" }], trash: ["BT6-017", "BT6-065", "BT6-112", "BT7-092"] },
        1: { trash: ["BT7-093", "BT7-094", "BT7-095"], battleArea: [{ card: "BT7-014", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    expect((s.state.players[0] as PlayerState).trash).toHaveLength(0);
    expect(opponent.trash.some((c) => c.cardId === "BT7-014")).toBe(true);
  });
});
