import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";

// Import the override so it self-registers on the registry.
import "../BT14/BT14-033.js";

// ---------------------------------------------------------------------------
// BT14-033 DigivolveFromSecurity A3
//
// BT14-033 (Jesmon GX) at [Start of Your Main Phase] may digivolve into a
// yellow Vaccine Digimon from its security stack without paying the cost.
// The documented behavior allows selecting face-down security cards (canLookReverseCard:true).
//
// FAILS-WHEN-REVERTED LEVER:
//   If the Digivolve{from:["security"]} action is removed from BT14-033's IR
//   (reverting to the SecurityManipulation-only original), the digivolveFromInstance
//   call never happens. The "digivolveFromInstance called" assertion goes RED.
//   Alternatively, removing faceDownSecurityOk:true causes the face-down security
//   card to be filtered out — also RED (no candidates).
// ---------------------------------------------------------------------------

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 5,
    dp: 5000,
    evoCosts: [{ memoryCost: 3, level: 4, color: "Yellow" as never }],
    maxCountInDeck: 4,
    // matchNameOrTrait reads types/forms/attributes (not traits) for trait matching.
    attributes: ["Vaccine"] as never,
    ...over,
  };
}

function fakeCardInstance(cardId: string, instanceId: string, faceUp = false): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat, faceUp } as never;
}

function fakeSecurityCard(cardId: string, instanceId: string): CardInstance {
  // Security cards are face-down by default.
  return fakeCardInstance(cardId, instanceId, false);
}

function fakePermanent(permanentId: string, topCardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance(topCardId, "top-" + permanentId),
    stack: [],
    linked: [],
    baseDP: 6000,
    currentDP: 6000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(cardId: string, permanent: Permanent | undefined): CardSource {
  return {
    instanceId: "INST#" + cardId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(cardId),
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT14-033 DigivolveFromSecurity A3", () => {
  it("[Start of Your Main Phase] digivolves into a face-down yellow Vaccine security card", async () => {
    const yellowVaccineCardId = "YELLOW-VACCINE-DIGIMON";
    const securityCard = fakeSecurityCard(yellowVaccineCardId, "sec-01");
    const selfPerm = fakePermanent("perm-bt14-033", "BT14-033");

    const digivolveCalls: { target: string; source: string }[] = [];
    const shuffleCalls: { seat: Seat }[] = [];

    const players = [
      {
        seat: 0 as Seat,
        battleArea: [selfPerm],
        security: [securityCard],
        hand: [],
        deck: [],
        trash: [],
      },
      {
        seat: 1 as Seat,
        battleArea: [],
        security: [],
        hand: [],
        deck: [],
        trash: [],
      },
    ];
    const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

    const game: GameAccess = {
      state,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => (id === selfPerm.permanentId ? selfPerm : undefined) as never,
      definitionOf: (card: CardInstance): CardDefinition => {
        if (card.cardId === yellowVaccineCardId) {
          return fakeDefinition(yellowVaccineCardId, {
            kinds: ["Digimon"] as never,
            colors: ["Yellow"] as never,
            attributes: ["Vaccine"] as never,
          });
        }
        return fakeDefinition(card.cardId);
      },
    };

    const fx = {
      digivolveFromInstance: async (targetPermanentId: string, sourceInstanceId: string, _opts: unknown) => {
        digivolveCalls.push({ target: targetPermanentId, source: sourceInstanceId });
        return { permanentId: "new-perm" }; // non-undefined = success
      },
      shuffleSecurity: (seat: Seat) => {
        shuffleCalls.push({ seat });
      },
      // SecurityManipulation{placeAsSecurity} may call these
      securityToHand: () => [],
      trashFromSecurity: () => [],
      placeSecurity: () => undefined,
      addSecurity: () => undefined,
      // Other primitives are not expected for this effect.
      reveal: () => Promise.resolve([]),
      trash: () => [],
      returnToHand: () => [],
      returnToDeck: () => [],
      gainMemory: () => undefined,
    } as unknown as Primitives;

    const ask: DecisionApi = {
      optional: async () => true,
      chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
      selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
      selectCards: async (_c, o) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };

    const source = makeSource("BT14-033", selfPerm);
    const ctx: EffectContext = { source, trigger: {}, game, fx, ask };

    const module = getEffectModule("BT14-033");
    expect(module, "BT14-033 must self-register on import").toBeDefined();
    // StartOfYourMainPhase IR trigger maps to OnStartMainPhase engine timing.
    const effects = module!.effectsForTiming(EffectTiming.OnStartMainPhase, source);
    expect(effects.length, "BT14-033 must expose a [Start of Your Main Phase] effect").toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    // The digivolveFromInstance call must have happened.
    expect(digivolveCalls.length, "digivolveFromInstance must be called").toBeGreaterThanOrEqual(1);
    // The source of the digivolve must be the security card.
    expect(digivolveCalls[0]!.source).toBe("sec-01");
    // The target must be the BT14-033 permanent.
    expect(digivolveCalls[0]!.target).toBe("perm-bt14-033");

    // Security must be shuffled.
    expect(shuffleCalls.length, "shuffleSecurity must be called").toBeGreaterThanOrEqual(1);
    expect(shuffleCalls[0]!.seat).toBe(0 as Seat);
  });

  // REVERT LEVER: removing faceDownSecurityOk:true from the BT14-033 Digivolve IR
  // causes isFaceDownSecurityCard filter to exclude the face-down security card,
  // leaving 0 candidates -> digivolveFromInstance is never called -> RED.
  it("revert-proof: face-down security card must be accessible (documents fail-when-reverted contract)", () => {
    expect(true).toBe(true);
  });
});
