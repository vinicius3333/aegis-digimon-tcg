import { EffectTiming } from "@aegis/shared";
import type { CardDefinition, CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-053 — Baihumon (EX5, Black/Yellow Lv.6 Digimon).
 *
 * Hand-written override of the declarative effect stub. The compiler's closed
 * `EffectTrigger` set (packages/shared/src/effects/ir.ts) has no tag for "when
 * your security is checked" — the declarative effect record mapped the printed
 * "[Opponent's Turn]" bracket to trigger "OpponentsTurn", which the interpreter
 * resolves to `EffectTiming.None` (a continuous/static window). That is wrong for
 * this card: the ability is a one-shot reaction to a specific security-check
 * event, not a continuous modifier, and the IR carried no reference to the
 * revealed security card at all.
 *
 * implemented by hand at `EffectTiming.OnSecurityCheck` (fired by
 * `engine/security/securityCheck.ts` for every security check, both players,
 * while the revealed card is still face-up in the security stack — see that
 * file's `SecurityCheckAttacker`/`fireTiming` call). This mirrors the existing
 * hand-written pattern for the same engine-gap class (BT16-033, BT22-080).
 *
 * Authoritative text (cards.json effectText; no errata reported; Q&A binding):
 *   [Hand] [Counter] ＜Blast Digivolve＞ (Your Digimon may digivolve into this
 *     card without paying the cost).
 *   [Opponent's Turn] [Once Per Turn] When your security is checked, if that
 *     card is a Digimon card with the [Deva] trait, play it without battling
 *     and without paying the cost.
 *   [On Deletion] Delete 1 of your opponent's highest play cost Digimon.
 *
 * KB rulings consulted (binding):
 *   Q3644: the effect activates ONLY when the security check reveals a Digimon
 *     card with the [Deva] trait — not merely when an attacking Digimon has Deva.
 *   Q3645: mandatory — "play it" leaves no choice; you must activate it and play
 *     the revealed Deva Digimon when the condition is met (no opt-out).
 *
 * "your security" = the security stack of THIS card's controller (the player
 * being attacked, whose Baihumon reacts to their OWN security check) —
 * `canTrigger` below reads `ctx.trigger.securityInstanceId` against
 * `source.ownerSeat`'s security zone, not the attacker's.
 *
 * "without battling": `ctx.fx.playFromSecurity` removes the revealed card from
 * the security stack immediately inside the OnSecurityCheck window (before the
 * security-check subsystem's own battle/trash resolution runs). `runSecurityCheck`
 * was given a matching minimal fix (engine/security/securityCheck.ts): after firing
 * OnSecurityCheck, it now checks whether the revealed card is still in the
 * security zone before running the normal battle/trash resolution branch — so a
 * card already relocated by an OnSecurityCheck effect (this card) skips the
 * battle entirely, satisfying "without battling" instead of double-resolving.
 *
 * The [Hand]/[Counter] ＜Blast Digivolve＞ grant and the [On Deletion] delete
 * are unaffected by the engine gap and are carried through the SAME compiled-IR
 * machinery (`irCardModule`) as any auto-generated card, so their behavior is
 * byte-identical to what the compiler would have produced.
 */

const cardId = "EX5-053";

function isDevaDigimon(def: CardDefinition): boolean {
  return (def.kinds as string[]).includes("Digimon") && (def.types ?? []).includes("Deva");
}

// The two clauses the compiler already encodes correctly (unaffected by the
// OnSecurityCheck gap): the Blast Digivolve keyword grant and the On Deletion
// delete-highest-play-cost. Run through the same interpreter machinery as an
// auto-generated card so their behavior stays identical to compiler output.
const baseCompiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "BlastDigivolve",
          },
          duration: "forTheTurn",
        },
      ],
      isFromHand: true,
      keywords: [],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestPlayCost",
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

const base = irCardModule(cardId, baseCompiled);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Opponent's Turn] [Once Per Turn] When your security is checked, if that card
    // is a Digimon card with the [Deva] trait, play it without battling and without
    // paying the cost. (KB Q3644/Q3645 — mandatory, gated on the revealed card.)
    if (timing === EffectTiming.OnSecurityCheck) {
      const effect: Effect = {
        effectKey: `${cardId}/opponents-turn-security-check-deva`,
        description:
          "[Opponent's Turn] [Once Per Turn] When your security is checked, if that card is a Digimon card with the [Deva] trait, play it without battling and without paying the cost.",
        optional: false, // KB Q3645: mandatory, no opt-out
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: 1,
        canTrigger: (ctx: EffectContext) => {
          if (!source.isOnBattleArea()) return false;
          const instanceId = ctx.trigger.securityInstanceId;
          if (instanceId === undefined) return false;
          // "your security" = THIS card's controller's own security stack.
          const security = ctx.game.player(source.ownerSeat).security;
          const revealed = security.find((c) => c.instanceId === instanceId);
          if (revealed === undefined) return false;
          return isDevaDigimon(ctx.game.definitionOf(revealed));
        },
        canActivate: () => true,
        resolve: async (ctx: EffectContext) => {
          const instanceId = ctx.trigger.securityInstanceId;
          if (instanceId === undefined) return;
          await ctx.fx.playFromSecurity(instanceId, { payCost: false });
        },
      };
      return [effect];
    }

    return base.effectsForTiming(timing, source);
  },
};

registerCard(module);
export default module;
