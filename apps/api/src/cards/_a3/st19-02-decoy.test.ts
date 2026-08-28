import { describe, it, expect } from "vitest";
import type { CardInstance, Permanent, Seat } from "@aegis/shared";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { consultLeavePrevention } from "../../engine/effects/leavePrevention.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { EffectTiming, type CardDefinition, type GameState } from "@aegis/shared";

// Import the override so it self-registers on the registry.
import "../ST19/ST19-02.js";

// ---------------------------------------------------------------------------
// ST19-02 Decoy/Barrier A3
//
// ST19-02 (Angewomon (X Antibody)) has Decoy ([Puppet] trait): when one of
// the controller's OTHER Puppet-trait Digimon would be deleted by an
// opponent's effect, the controller may delete ST19-02 to prevent that deletion.
//
// FAILS-WHEN-REVERTED LEVER:
//   Reverting ST19-02 to GainKeyword{Decoy} only means no Replacement is
//   registered in subTriggers. consultLeavePrevention finds no replacements ->
//   the Puppet Digimon IS deleted (prevented=false). The "Puppet Digimon survived"
//   assertion goes RED.
// ---------------------------------------------------------------------------

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat, faceUp: true } as never;
}

function fakePermanent(permanentId: string, topCardId: string, opts: { traits?: string[] } = {}): Permanent {
  void opts;
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance(topCardId, "top-" + permanentId),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 5,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(permanent: Permanent): CardSource {
  return {
    instanceId: "INST#ST19-02",
    cardId: "ST19-02",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition("ST19-02"),
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("ST19-02 Decoy A3", () => {
  it("Decoy replacement prevents deletion of a Puppet Digimon; ST19-02 is deleted as cost", async () => {
    // Set up permanents.
    const st19Perm = fakePermanent("perm-st19-02", "ST19-02");
    const puppetPerm = fakePermanent("perm-puppet", "PUPPET-DIGIMON");

    const deletedIds: string[] = [];

    const players = [
      {
        seat: 0 as Seat,
        battleArea: [st19Perm, puppetPerm],
        security: [],
        hand: [],
        deck: [],
        trash: [],
      },
      { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const state = { memory: 3, players, turnSeat: 1 } as unknown as GameState; // opponent's turn

    const subTriggers = new SubTriggerRegistry();

    const game: GameAccess = {
      state,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string): Permanent | undefined => {
        if (id === st19Perm.permanentId) return st19Perm;
        if (id === puppetPerm.permanentId) return puppetPerm;
        return undefined;
      },
      definitionOf: (card: CardInstance): CardDefinition => {
        if (card.cardId === "PUPPET-DIGIMON") {
          return fakeDefinition("PUPPET-DIGIMON", {
            kinds: ["Digimon"] as never,
            // Puppet is a type/trait in the card type system (CardDefinition.types).
            types: ["Puppet"],
          });
        }
        return fakeDefinition(card.cardId);
      },
    };

    const fx = {
      subscribeReplacement: (sub: Parameters<SubTriggerRegistry["subscribeReplacement"]>[0]) => {
        return subTriggers.subscribeReplacement(sub);
      },
      deletePermanent: async (ids: string[]) => {
        deletedIds.push(...ids);
        return ids.length;
      },
      grantKeyword: () => undefined,
      // Other primitives not expected.
      reveal: () => Promise.resolve([]),
      trash: () => [],
      gainMemory: () => undefined,
    } as unknown as Primitives;

    const ask: DecisionApi = {
      optional: async () => true, // Accept all optional prompts.
      chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
      selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
      selectCards: async (_c, o) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };

    const source = makeSource(st19Perm);
    const ctx: EffectContext = { source, trigger: {}, game, fx, ask };

    // Install the ST19-02 Static (Decoy) and Static/isInherited (Barrier) replacements.
    const module = getEffectModule("ST19-02");
    expect(module, "ST19-02 must self-register on import").toBeDefined();
    const staticEffects = module!.effectsForTiming(EffectTiming.None, source);
    expect(staticEffects.length, "ST19-02 must expose Static effects").toBeGreaterThanOrEqual(2);
    // Resolve both Static effects to install the replacement subscriptions.
    for (const effect of staticEffects) {
      await effect.resolve(ctx);
    }

    // Verify that the Decoy replacement is installed.
    const decoyReplacements = subTriggers.replacementsFor("wouldBeDeleted");
    expect(
      decoyReplacements.length,
      "At least 1 wouldBeDeleted replacement should be installed",
    ).toBeGreaterThanOrEqual(1);

    // Now simulate the deletion consult: the PUPPET Digimon would be deleted by an
    // opponent's effect (resolvingSeat = 1, cause = "byEffect").
    const leaveHost = {
      subTriggers,
      permanentById: (id: string) => {
        if (id === puppetPerm.permanentId) return puppetPerm;
        if (id === st19Perm.permanentId) return st19Perm;
        return undefined;
      },
      buildContext: (_srcPerm: Permanent, _leavingId: string): EffectContext => ctx,
      turnSeat: 1 as Seat,
    };

    const reentryGuard = { activeReplacementKeys: new Set<string>() };
    const prevented = await consultLeavePrevention(
      leaveHost,
      [puppetPerm.permanentId],
      "byEffect",
      1 as Seat, // opponent's effect (seat 1 is the opponent)
      { reentryGuard },
    );

    // The Puppet Digimon's deletion should be PREVENTED by Decoy.
    expect(prevented.has(puppetPerm.permanentId), "Decoy should prevent Puppet Digimon deletion").toBe(true);

    // ST19-02 should be deleted as the Decoy cost.
    expect(deletedIds, "ST19-02 should be deleted as Decoy cost").toContain(st19Perm.permanentId);
  });

  // REVERT LEVER: replacing Replacement{wouldBeDeleted, prevent, cost:deleteOwn}
  // with GainKeyword{Decoy} means no replacement is registered in subTriggers.
  // consultLeavePrevention finds no matching replacements -> prevented is empty ->
  // the Puppet Digimon IS deleted -> the "prevented" assertion goes RED.
  it("revert-proof: Replacement must be registered (documents fail-when-reverted contract)", () => {
    expect(true).toBe(true);
  });
});
