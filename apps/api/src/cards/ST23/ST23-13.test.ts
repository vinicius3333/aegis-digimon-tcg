import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./ST23-13.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST23-13 Tomoro Tenma & Kyo Sawashiro", () => {
  it("places the exact deck-top card face down under itself and gains memory when the opponent has a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST23-13", as: "tamer" }], deck: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-002"] },
      },
      { autoAcceptOptional: true },
    );
    const deckTopId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (perm) =>
            perm.topCard?.instanceId === s.inst("tamer").instanceId &&
            perm.stack.some((card) => card.instanceId === deckTopId),
        ) && s.state.memory === 7,
    );
    const playedTamer = s.state.players[0]!.battleArea.find(
      (perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId,
    )!;
    expect(playedTamer.stack).toHaveLength(1);
    expect(playedTamer.stack[0]!.instanceId).toBe(deckTopId);
    expect(playedTamer.stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("still gains mandatory memory when the optional deck-top placement is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST23-13", as: "tamer" }], deck: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("tamer").stack).toHaveLength(0);
  });

  it("reacts only when an effect trashes a card from under this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-13", as: "tamer", under: [{ card: "BT1-001", as: "ownUnder", faceUp: false }] },
            { card: "ST23-11", as: "glowing" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-002", as: "otherUnder" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(s.perm("otherHost").permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("glowing").currentDP).toBe(4000);

    await primitivesOf(s).trashDigivolutionCards(s.perm("tamer").permanentId, [s.inst("ownUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.perm("tamer").isSuspended && s.perm("glowing").currentDP === 7000);
    expect(s.perm("glowing").currentDP).toBe(7000);
  });
});
