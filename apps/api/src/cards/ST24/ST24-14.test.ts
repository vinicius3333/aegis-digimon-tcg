import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST24-14 Yoshino & Keenan", () => {
  it("on play places the deck top face down under the Tamer and gains memory for an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-14");
    expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
    expect(s.state.memory).toBe(-3);
  });

  it("does not gain memory from an opponent's Tamer alone", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST24-14", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] },
        1: { battleArea: [{ card: "ST24-13", as: "opponentTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory < 0);
    expect(s.state.memory).toBe(-4);
  });

  it("suspends exactly one opponent Digimon when this Tamer's stacked card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST24-14", as: "tamer", under: [{ card: "BT1-001", as: "underCard", faceUp: false }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentTarget" },
            { card: "BT1-010", as: "opponentOther" },
            { card: "ST24-13", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamer = s.perm("tamer");
    const underCardId = s.inst("underCard").instanceId;
    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(tamer.permanentId, [underCardId], { byEffectSeat: 0 });
    await settle(() => tamer.isSuspended && s.perm("opponentTarget").isSuspended);

    expect(tamer.isSuspended).toBe(true);
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.perm("opponentOther").isSuspended).toBe(false);
    expect(s.perm("opponentTamer").isSuspended).toBe(false);
  });

  it("does not trigger when effects trash a card under a different permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-14", as: "tamer" },
            { card: "BT1-009", as: "otherHost", under: [{ card: "BT1-001", as: "otherUnder" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherHost = s.perm("otherHost");
    await s.engine.recomputeContinuousEffects();
    await primitivesOf(s).trashDigivolutionCards(otherHost.permanentId, [s.inst("otherUnder").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
