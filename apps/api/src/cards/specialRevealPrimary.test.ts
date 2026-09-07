import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { getEffectModule } from "../engine/effects/registry.js";
import type { CardSource } from "../engine/effects/CardSource.js";
import { setupEngine, settle } from "../engine/testkit/harness.js";
// Self-register every compiled-IR card module so the options + named/trait fodder resolve.
import "./index.js";

// A3 for the reveal-add PRIMARY of five heterogeneous reveal cards — the cases the homogeneous
// "Memory Boost!" family (revealAddFamily.test.ts) does not exercise:
//   ST21-14  reveal 3, add 1 [ADVENTURE]-trait card to hand           (trait-match, no kind/color)
//   ST17-11  reveal 3, add 1 green Digimon + 1 Tamer to hand          (two distinct add buckets)
//   BT10-097 reveal 6, add 2 [Blue Flare] to hand + play 1 Kiriha     (count-2 bucket + a play bucket)
//   P-112    reveal 3, add 1 [Eosmon] + 1 [Menoa Bellucci] to hand    (On Play on a Digimon, two names)
//   EX7-048  reveal 6, use 1 [Three Musketeers] Option without cost   (On Play, reveal-to-play bucket)
//
// SCOPE: each test forces the choice by stacking exactly the matching + non-matching cards on top of
// the deck, then asserts the reveal-add routing — the matching cards land in hand, the non-matching
// revealed cards return to the deck, and (where the clause has a "to play"/"use" bucket) the played
// card is taken from the deck rather than returned. The co-resident ＜Delay＞ payloads and the
// secondary play-cost clauses (P-112's place-under-Eosmon play, ST17-11's ＜Delay＞ play) are out of
// scope here — they are covered/known elsewhere.
//
// FAILS-WHEN-REVERTED: a RevealAdd that mis-filters (wrong trait/kind/color/name) or routes the rest
// elsewhere turns the per-card hand/deck assertions RED.

// Trait/name fodder used as deck contents (all effect-inert when merely added to hand).
const RED = "BT1-009"; // red Digimon, no ADVENTURE trait
const YELLOW = "BT1-045"; // yellow Digimon
const GREEN = "BT1-064"; // green Digimon (Goblimon), no ADVENTURE trait
const BLUE = "BT1-027"; // blue Digimon
const ADVENTURE_DIGIMON = "AD1-001"; // Greymon — has the [ADVENTURE] trait
const TAMER = "BT1-089"; // green Tamer, matching ST17-11's second bucket
const BLUE_FLARE_1 = "BT19-016"; // Gaossmon — Blue, [Blue Flare]
const BLUE_FLARE_2 = "BT11-030"; // MetalGreymon + Cyber Launcher — Blue, [Blue Flare]
const KIRIHA = "BT10-088"; // Kiriha Aonuma (Tamer)
const EOSMON = "BT6-083"; // Eosmon
const MENOA = "BT6-092"; // Menoa Bellucci (Tamer)
const TM_OPTION = "EX7-070"; // Der Blitz — Option with the [Three Musketeers] trait

const inZone = (zone: readonly CardInstance[], cardId: string): number =>
  zone.filter((c) => c.cardId === cardId).length;

function stubSource(cardId: string): CardSource {
  const definition = getCardDefinition(cardId);
  if (definition === undefined) throw new Error(`no definition for ${cardId}`);
  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat: 0 as Seat,
    definition,
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

// Case 2 regression: an Option's on-play [Main] body lives ONLY at OnUseOption. It must NOT also
// be exposed at OnDeclaration — otherwise an Option that places itself as a battle-area permanent
// (ST21-14 + the whole option-permanent family) would re-fire its play effect on the permanent.
// The only OnDeclaration activatable on these option permanents is the ＜Delay＞ clause.
//
// FAILS-WHEN-REVERTED: restoring the unconditional [OnUseOption, OnDeclaration] dual-bucket for a
// plain [Main] re-exposes the reveal-add at OnDeclaration, so ST21-14's OnDeclaration count is 2.
describe("Option [Main] body routing — no OnDeclaration dual-bucket", () => {
  it("ST21-14: reveal-add primary is at OnUseOption only; OnDeclaration holds just the ＜Delay＞", () => {
    const module = getEffectModule("ST21-14");
    expect(module, "ST21-14 must be registered").toBeDefined();
    const source = stubSource("ST21-14");
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(1);
  });
});

describe("heterogeneous reveal-add primaries", () => {
  it("ST21-14: adds the [ADVENTURE]-trait card to hand, returns the rest to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", dp: 3000 }], // §4-21 color-requirement source (Purple)
          hand: [{ card: "ST21-14", as: "option", faceUp: true }],
          deck: [{ card: ADVENTURE_DIGIMON }, { card: RED }, { card: GREEN }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, ADVENTURE_DIGIMON) > 0);

    expect(inZone(p0.hand, ADVENTURE_DIGIMON)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
    expect(inZone(p0.deck, ADVENTURE_DIGIMON)).toBe(0);
  });

  it("ST17-11: adds 1 green Digimon AND 1 green Tamer to hand, returns the third to the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN, dp: 3000 }], // §4-21 color-requirement source
          hand: [{ card: "ST17-11", as: "option", faceUp: true }],
          deck: [{ card: GREEN }, { card: TAMER }, { card: RED }], // RED matches neither bucket -> returns to deck
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, GREEN) > 0 && inZone(p0.hand, TAMER) > 0);

    expect(inZone(p0.hand, GREEN)).toBe(1);
    expect(inZone(p0.hand, TAMER)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(0);
    expect(inZone(p0.deck, TAMER)).toBe(0);
  });

  it("BT10-097: adds 2 [Blue Flare] to hand, plays Kiriha from the deck, returns the fodder", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLUE, dp: 3000 }], // §4-21 color-requirement source
          hand: [{ card: "BT10-097", as: "option", faceUp: true }],
          deck: [
            { card: BLUE_FLARE_1 },
            { card: BLUE_FLARE_2 },
            { card: KIRIHA },
            { card: RED },
            { card: YELLOW },
            { card: GREEN },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    // The "play Kiriha" bucket runs AFTER the add-to-hand bucket, so settle on the LAST observable
    // (Kiriha leaving the deck) rather than the Blue Flare cards landing in hand.
    await settle(
      () => p0.battleArea.some((perm) => perm.topCard?.cardId === KIRIHA) && inZone(p0.hand, BLUE_FLARE_1) > 0,
      5000,
    );

    expect(inZone(p0.hand, BLUE_FLARE_1)).toBe(1);
    expect(inZone(p0.hand, BLUE_FLARE_2)).toBe(1);
    // Kiriha was played from among the revealed cards: it left the deck for the battle area.
    expect(inZone(p0.deck, KIRIHA)).toBe(0);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === KIRIHA)).toBe(true);
    // The three non-matching revealed cards go back to the deck.
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, YELLOW)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
  });

  it("P-112: On Play adds 1 [Eosmon] AND 1 [Menoa Bellucci] to hand, returns the third", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-112", as: "digimon", faceUp: true }],
          deck: [{ card: EOSMON }, { card: MENOA }, { card: RED }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.hand, EOSMON) > 0 && inZone(p0.hand, MENOA) > 0);

    expect(inZone(p0.hand, EOSMON)).toBe(1);
    expect(inZone(p0.hand, MENOA)).toBe(1);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, EOSMON)).toBe(0);
    expect(inZone(p0.deck, MENOA)).toBe(0);
  });

  it("EX7-048: On Play takes the [Three Musketeers] Option from the deck, returns the fodder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-048", as: "digimon", faceUp: true }],
          deck: [
            { card: TM_OPTION },
            { card: RED },
            { card: YELLOW },
            { card: GREEN },
            { card: BLUE },
            { card: "BT1-010" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    s.state.memory = 14;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("digimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => inZone(p0.deck, TM_OPTION) === 0);

    // The Three Musketeers Option was selected for the "use 1 Option without cost" bucket, so it
    // left the deck (it is not among the revealed cards returned to the deck).
    expect(inZone(p0.deck, TM_OPTION)).toBe(0);
    expect(inZone(p0.deck, RED)).toBe(1);
    expect(inZone(p0.deck, YELLOW)).toBe(1);
    expect(inZone(p0.deck, GREEN)).toBe(1);
  });
});
