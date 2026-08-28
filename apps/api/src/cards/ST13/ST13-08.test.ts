import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-112.js";
import "./ST13-08.js";
import "./ST13-16.js";

describe("ST13-08 Chikurimon", () => {
  it("prevents play-cost reductions for both players", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST13-08"], hand: [{ card: "BT2-112", as: "blackWarGreymon" }] },
      1: { battleArea: [{ card: "BT1-084", dp: 10000 }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blackWarGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT2-112"));
    expect(s.state.memory).toBe(-9);
  });

  it("does not prevent an effect from playing a card without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST13-08", "BT1-009"],
          hand: [
            { card: "ST13-16", as: "option" },
            { card: "ST13-02", as: "zubamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-02"));

    expect(s.state.memory).toBe(0);
  });
});
