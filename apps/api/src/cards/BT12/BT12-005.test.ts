import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-005.js";

describe("BT12-005 Kozenimon", () => {
  it("draws when a Digimon with Save in its text is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-049", under: ["BT12-005"] }],
        hand: [{ card: "BT12-008", as: "saved" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("saved").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw for a Digimon without Save", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-049", under: ["BT12-005"] }],
        hand: [{ card: "BT1-009", as: "plain" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("plain").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-009"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw when the opponent plays a Digimon with Save", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-049", under: ["BT12-005"] }], deck: ["BT1-009"] },
      1: { hand: [{ card: "BT12-008", as: "saved" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("saved").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-008"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws only once per turn across repeated qualifying plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-049", under: ["BT12-005"] }],
        hand: [
          { card: "BT12-008", as: "first" },
          { card: "BT12-008", as: "second" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 20;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
