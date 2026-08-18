import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type PlayerState,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  DecisionApi,
  EffectContext,
  GameAccess,
  Primitives,
} from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-016.js";
import "../index.js";

// BT11-016 Phoenixmon [On Deletion]: You may play 1 red Digimon with [Avian]/[Bird]/
// [Beast]/[Animal]/[Sovereign] in one of its traits (other than [Sea Animal]) and
// 3000 DP or less from your hand without paying the cost. For each red Tamer you have
// in play, add 2000 to the maximum DP of the card you can play by this effect.
//
// KB (binding over the printed text):
//   - Q2059: the trait gate accepts any trait CONTAINING Avian/Bird/Beast/Animal/
//     Sovereign regardless of other words/pluralization, EXCEPT exactly [Sea Animal].
//   - Q2060: maximum DP = 3000 + 2000 per red Tamer in play (1 red Tamer -> 5000;
//     2 -> 7000). Q2061: that scaling applies ONLY to this card's [On Deletion] play.
//
// The candidate filter reads LIVE card data via requireCardDefinition(card.cardId)
// (apps/api/src/cards/BT11/BT11-016.ts:85-87), so the hand candidates below are staged
// by their REAL cardIds and their dp/colors/types come from the populated cards.json
// table — this is the trait-data-populated proof (the override's prior DATA-BLOCKED
// state had empty types and matched nothing). The red-Tamer count is read off the
// battle area via ctx.game.definitionOf (overridable in the fake context).
//
// CONCRETE CANDIDATE POOL (from packages/shared/src/cards/data/cards.json):
//   - BT1-013 Birdramon: red, Digimon, types ["Avian"], dp 5000 (the scaling boundary).
//   - BT1-022:           red, Digimon, types ["Birdkin"], dp 7000 (over the K=1 cap).
//   - BT14-008:          red, Digimon, types ["Sea Animal"], dp 2000 (Q2059 exclusion).
//
// FAILS-WHEN-REVERTED LEVERS (verified, then restored — see SUMMARY):
//   1. Force maxPlayableDp to a flat 3000 (drop the per-Tamer term): the 5000-DP
//      BT1-013 is no longer offered at K=1 -> the "K=1 offers 5000" assertions go RED.
//   2. Empty CardDefinition.types in cards.json (the original DATA-BLOCKED state):
//      hasPlayableTrait matches nothing -> the candidate set is empty -> RED.
//   3. (real-engine) Revert ruleProcess to `async () => {}`: the 0-DP Phoenixmon is
//      never deleted, OnDestroyedAnyone never fires, the candidate is never played -> RED.

const RED_AVIAN_5000 = "BT1-013"; // Birdramon, red Avian, dp 5000 (boundary).
const RED_AVIAN_7000 = "BT1-022"; // red Birdkin, dp 7000 (over the K=1 cap).
const RED_SEA_ANIMAL = "BT14-008"; // red, types exactly ["Sea Animal"], dp 2000 (Q2059 exclusion).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function makeSource(): CardSource {
  return {
    instanceId: "INST#BT11016",
    cardId: "BT11-016",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "BT11-016",
      set: "BT11",
      nameEn: "Phoenixmon",
      kinds: ["Digimon"],
      colors: ["Red"],
      playCost: 12,
      dp: 11000,
      evoCosts: [],
      maxCountInDeck: 4,
      types: ["Holy Beast"],
    } as unknown as CardDefinition,
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat } as never;
}

/**
 * A fake context whose controller holds `redTamerCount` red Tamers in play (so
 * maxPlayableDp = 3000 + 2000 * redTamerCount) and a hand of the given candidate
 * cardIds. Red-Tamer definitions are supplied via cardDefinitions overrides (read by
 * the override's maxPlayableDp through ctx.game.definitionOf); the HAND candidates'
 * dp/colors/types come from the live card-data table (requireCardDefinition).
 */
function makeContext(opts: {
  recorder: Recorder;
  redTamerCount: number;
  handCardIds: string[];
  selectFirst?: boolean;
}): EffectContext {
  const battleArea = Array.from({ length: opts.redTamerCount }, (_, i) => ({
    permanentId: `tamer-${i}`,
    isSuspended: false,
    currentDP: 0,
    stack: [] as never[],
    topCard: fakeCardInstance("RED-TAMER", `tamer-top-${i}`),
  }));

  const hand = opts.handCardIds.map((cardId, i) =>
    fakeCardInstance(cardId, `hand-${cardId}-${i}`),
  );

  const players = [
    { seat: 0 as Seat, battleArea, security: [], hand, deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) => battleArea.find((p) => p.permanentId === id) as never,
    definitionOf: (card: CardInstance): CardDefinition => {
      // The fake battle-area Tamers are red Tamers (drive the maxPlayableDp count).
      if (card.cardId === "RED-TAMER") {
        return { cardId: "RED-TAMER", kinds: ["Tamer"], colors: ["Red"], dp: 0 } as unknown as CardDefinition;
      }
      return { cardId: card.cardId } as unknown as CardDefinition;
    },
  } as unknown as GameAccess;

  let offered: string[] = [];
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => {
      offered = o.candidates;
      opts.recorder.calls.push({ verb: "selectCards", args: [o.candidates, o.min, o.max] });
      return opts.selectFirst ? o.candidates.slice(0, 1) : o.candidates.slice(0, o.max);
    },
    chooseOption: async () => 0,
  };

  const fx = {
    playFromHand: async (ids: string[], playOpts: { payCost: boolean }) => {
      opts.recorder.calls.push({ verb: "playFromHand", args: [ids, playOpts] });
    },
  } as unknown as Primitives;

  void offered;
  return { source: makeSource(), trigger: {}, game, fx, ask };
}

function offeredCandidates(recorder: Recorder): string[] {
  const call = recorder.calls.find((c) => c.verb === "selectCards");
  return (call?.args[0] as string[] | undefined) ?? [];
}

/** Map an offered hand instanceId back to its cardId (instanceId is `hand-<cardId>-<i>`). */
function offeredCardIds(recorder: Recorder, ctx: EffectContext): string[] {
  const seat0 = ctx.game.player(0 as Seat) as unknown as { hand: CardInstance[] };
  const byInstance = new Map(seat0.hand.map((c) => [c.instanceId, c.cardId]));
  return offeredCandidates(recorder).map((id) => byInstance.get(id) ?? id);
}

describe("BT11-016 Phoenixmon [On Deletion] scaling max-DP play cap + trait gate", () => {
  const module = getEffectModule("BT11-016");

  it("registers on import", () => {
    expect(module, "BT11-016 must self-register").toBeDefined();
  });

  it("routes [On Deletion] to OnDestroyedAnyone and the re-activation to OnLoseSecurity", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnLoseSecurity, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  async function resolveOnDeletion(ctx: EffectContext): Promise<void> {
    const effect = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, makeSource())[0]!;
    await effect.resolve(ctx);
  }

  it("Q2060 K=1: cap is 5000 — a 5000-DP red Avian IS offered, a 7000-DP red Avian is NOT", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 1,
      handCardIds: [RED_AVIAN_5000, RED_AVIAN_7000],
    });
    await resolveOnDeletion(ctx);
    const offered = offeredCardIds(recorder, ctx);
    expect(offered).toContain(RED_AVIAN_5000);
    expect(offered).not.toContain(RED_AVIAN_7000);
  });

  it("Q2060 K=0: cap is 3000 — the 5000-DP red Avian is NOT offered (the scaling boundary)", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 0,
      handCardIds: [RED_AVIAN_5000],
    });
    await resolveOnDeletion(ctx);
    // No candidate at all -> selectCards is never called.
    expect(offeredCardIds(recorder, ctx)).not.toContain(RED_AVIAN_5000);
    expect(recorder.calls.some((c) => c.verb === "playFromHand")).toBe(false);
  });

  it("Q2060 K=2: cap is 7000 — a 7000-DP red Avian IS offered", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 2,
      handCardIds: [RED_AVIAN_7000],
    });
    await resolveOnDeletion(ctx);
    expect(offeredCardIds(recorder, ctx)).toContain(RED_AVIAN_7000);
  });

  it("Q2059: a trait of exactly [Sea Animal] is rejected even at low DP", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 2,
      handCardIds: [RED_SEA_ANIMAL],
    });
    await resolveOnDeletion(ctx);
    expect(offeredCardIds(recorder, ctx)).not.toContain(RED_SEA_ANIMAL);
    expect(recorder.calls.some((c) => c.verb === "playFromHand")).toBe(false);
  });

  it("Q2059: a trait containing an accepted token ([Avian]) is accepted", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 1,
      handCardIds: [RED_AVIAN_5000],
    });
    await resolveOnDeletion(ctx);
    expect(offeredCardIds(recorder, ctx)).toContain(RED_AVIAN_5000);
  });

  it("plays the chosen candidate WITHOUT paying its cost (payCost:false)", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({
      recorder,
      redTamerCount: 1,
      handCardIds: [RED_AVIAN_5000],
      selectFirst: true,
    });
    await resolveOnDeletion(ctx);
    const play = recorder.calls.find((c) => c.verb === "playFromHand");
    expect(play, "the chosen candidate must be played from hand").toBeDefined();
    expect((play!.args[1] as { payCost: boolean }).payCost).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real-engine end-to-end proof: the [On Deletion] effect ACTUALLY FIRES through
// the live fireTiming(OnDestroyedAnyone) path when Phoenixmon is deleted by the
// state-based-action fixpoint, playing the red Avian candidate from hand. This is
// the strongest fails-when-reverted lever (lever 3 above): it exercises the whole
// wired chain, not just effect.resolve over a fake context.
// ---------------------------------------------------------------------------

describe("BT11-016 [On Deletion] fires in a live match (real fireTiming chain)", () => {
  it("a deleted Phoenixmon with 1 red Tamer plays a 5000-DP red Avian from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // 1 red Tamer in play -> cap = 5000 (Q2060).
            { card: "AD1-020", dp: 0, as: "tamer" },
            // Phoenixmon on field, staged at 0 DP so the state-based-action fixpoint deletes it.
            { card: "BT11-016", dp: 0, as: "phoenixmon" },
          ],
          hand: [
            // Hand candidate: red Avian at exactly 5000 DP (the scaling boundary).
            { card: RED_AVIAN_5000, faceUp: false, as: "candidate" },
            // Drive a state-based-action sweep by playing a vanilla On-Play card (BT6-036: gain 2).
            { card: "BT6-036", faceUp: false, as: "filler" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    s.state.memory = 4;
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("filler").instanceId });

    await settle(
      () =>
        !p0.battleArea.some((p) => p.topCard?.cardId === "BT11-016") &&
        p0.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000),
    );

    // Phoenixmon was deleted by the fixpoint; its [On Deletion] fired and played the
    // 5000-DP red Avian from hand (cap 5000 with 1 red Tamer).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-016")).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === RED_AVIAN_5000)).toBe(true);
    expect(p0.hand.some((c) => c.cardId === RED_AVIAN_5000)).toBe(false);
    // No loud gap (no UnsupportedEffectError surfaced as actionRejected).
    expect(
      s.events.find(
        (e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason),
      ),
    ).toBeUndefined();
  });
});
