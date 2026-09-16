import { describe, it, expect } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function hasKeyword(s: EngineSetup, permanentId: string, keyword: string): boolean {
  return (
    s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }
  ).continuous.hasKeyword(permanentId, keyword);
}

describe("ST24-13 Marcus & Thomas — whenDigivolutionCardTrashed from THIS Tamer → suspend, Jamming", () => {
  it("continues to conditional memory gain when optional placement is declined", () => {
    const card = runtimeCompiledCard("ST24-13");
    const onPlay = card?.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({ kind: "PlaceUnder", optional: true });
    expect(onPlay?.actions[0]).not.toHaveProperty("abortOnDecline");
    expect(onPlay?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });

  it("suspends the Tamer and grants Jamming to a DATA SQUAD Digimon when a card under this Tamer is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-13", dp: 0, as: "tamer", under: [{ card: "BT1-001", as: "underCard", faceUp: false }] },
            { card: "AD1-016", dp: 12000, as: "datSquadDigimon" },
            { card: "BT1-009", dp: 6000, as: "nonDatSquadDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamer = s.perm("tamer");
    const underCardId = s.inst("underCard").instanceId;

    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(tamer.permanentId, [underCardId], {
      byEffectSeat: 0,
    });

    await settle(() => tamer.isSuspended);

    expect(tamer.isSuspended).toBe(true);
    expect(hasKeyword(s, s.perm("datSquadDigimon").permanentId, "Jamming")).toBe(true);
    expect(hasKeyword(s, s.perm("nonDatSquadDigimon").permanentId, "Jamming")).toBe(false);
  });

  it("on play places the deck top face down and gains memory when an opponent has a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST24-13", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === -3);
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-13");
    expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
    expect(s.state.memory).toBe(-3);
  });

  it("does NOT grant when the host permanent is a DIFFERENT Tamer (sourceFilter gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-13", dp: 0, as: "tamer" },
            { card: "BT1-009", dp: 6000, as: "otherDigimon", under: [{ card: "BT1-002", as: "otherUnder" }] },
            { card: "AD1-016", dp: 12000, as: "datSquadDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamer = s.perm("tamer");
    const otherDigimon = s.perm("otherDigimon");
    const otherUnderId = s.inst("otherUnder").instanceId;

    await s.engine.recomputeContinuousEffects();

    await primitivesOf(s).trashDigivolutionCards(otherDigimon.permanentId, [otherUnderId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    expect(tamer.isSuspended).toBe(false);
  });
});
