import { describe, it, expect } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST24-13 (Marcus Damon & Thomas H. Norstein):
//   "[Your Turn] When effects trash cards from under this Tamer, by suspending this
//    Tamer, 1 of your [DATA SQUAD] trait Digimon gains <Jamming> for the turn."
//
// We drive the onDigivolutionCardDiscarded event via primitives.trashDigivolutionCards,
// which fires the SubTrigger. We verify the Tamer is suspended and the DATA SQUAD Digimon
// gained Jamming.
//
// FAILS-WHEN-REVERTED: without the YourTurn watcher, neither the Tamer suspension nor the
// Jamming grant happens.
//
// Card IDs used:
//   ST24-13  — Marcus & Thomas (the card under test, yellow Tamer)
//   AD1-016  — ShineGreymon (DATA SQUAD Lv.7 Digimon — target for Jamming grant)
//   BT1-001  — placeholder card placed under the Tamer

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function hasKeyword(s: EngineSetup, permanentId: string, keyword: string): boolean {
  return (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous.hasKeyword(
    permanentId,
    keyword,
  );
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
            // ST24-13 (Marcus & Thomas Tamer) on battle area with a card under it.
            // face-down under the Tamer per KB Q6224-Q6227
            { card: "ST24-13", dp: 0, as: "tamer", under: [{ card: "BT1-001", as: "underCard", faceUp: false }] },
            // A DATA SQUAD Digimon on p0's battle area (the Jamming target).
            { card: "AD1-016", dp: 12000, as: "datSquadDigimon" },
            // A non-DATA SQUAD Digimon must not be a legal Jamming target.
            { card: "BT1-009", dp: 6000, as: "nonDatSquadDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamer = s.perm("tamer");
    const underCardId = s.inst("underCard").instanceId;

    await s.engine.recomputeContinuousEffects();

    // Trash the card under the Tamer via the DigivolveCards trash path — this fires
    // onDigivolutionCardDiscarded with the host (tamer) as subjectPermanentId.
    await primitivesOf(s).trashDigivolutionCards(tamer.permanentId, [underCardId], {
      byEffectSeat: 0,
    });

    // Wait for the YourTurn watcher to run and grant Jamming.
    await settle(() => tamer.isSuspended);

    expect(tamer.isSuspended).toBe(true);
    expect(hasKeyword(s, s.perm("datSquadDigimon").permanentId, "Jamming")).toBe(true);
    expect(hasKeyword(s, s.perm("nonDatSquadDigimon").permanentId, "Jamming")).toBe(false);
  });

  it("on play places the deck top face down and gains memory when an opponent has a Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST24-13", as: "tamer" }], deck: [{ card: "BT1-001", as: "deckTop" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    const tamer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "ST24-13");
    expect(tamer?.stack).toContainEqual(expect.objectContaining({ cardId: "BT1-001", faceUp: false }));
    expect(s.state.memory).toBe(-3);
  });

  it("does NOT grant when the host permanent is a DIFFERENT Tamer (sourceFilter gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // ST24-13 Tamer with NO cards under it.
            { card: "ST24-13", dp: 0, as: "tamer" },
            // A DIFFERENT Digimon (not ST24-13) that has a digi-card under it.
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

    // Trash a card from ANOTHER Digimon's digi-stack (not ST24-13's).
    await primitivesOf(s).trashDigivolutionCards(otherDigimon.permanentId, [otherUnderId], {
      byEffectSeat: 0,
    });
    await settle(() => false, 100);

    // The Tamer was NOT involved — it should stay unsuspended.
    expect(tamer.isSuspended).toBe(false);
  });
});
