import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-107.js";

describe("BT8-107 Pandemonium Flame", () => {
  it("deletes an opposing unsuspended Digimon at or below the deleted Digimon's level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-041", as: "cost" }],
        hand: [{ card: "BT8-107", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT8-023", as: "eligible" },
          { card: "BT8-041", as: "tooHigh" },
        ],
      },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.perm("eligible").topCard.instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });

  it("can still pay its own deletion cost when no opposing target is eligible", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-041", as: "cost" }],
        hand: [{ card: "BT8-107", as: "option" }],
      },
      1: { battleArea: [{ card: "BT8-041", as: "tooHigh" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
