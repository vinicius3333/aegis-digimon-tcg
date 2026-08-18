import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT19-090";

const hasTrait = (def: CardDefinition, trait: string): boolean => {
  const traits: string[] = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.includes(trait);
};

/** Cards under the controller's Tamers that are [Xros Heart] Digimon with DP ≤ 4000. */
const xrosHeartUnderTamer = (ctx: EffectContext, ownerSeat: Seat): CardInstance[] => {
  const out: CardInstance[] = [];
  for (const permanent of ctx.game.player(ownerSeat).battleArea) {
    if (permanent.topCard === undefined) continue;
    if (!(ctx.game.definitionOf(permanent.topCard).kinds as string[]).includes("Tamer")) continue;
    for (const c of permanent.stack) {
      const def = ctx.game.definitionOf(c);
      if (isDigimon(def) && hasTrait(def, "Xros Heart") && def.dp <= 4000) out.push(c);
    }
  }
  return out;
};

/** Owner battle-area permanents whose top card is a SUSPENDED Digimon named `name`. */
const suspendedNamed = (ctx: EffectContext, ownerSeat: Seat, name: string): Permanent[] =>
  Array.from(ctx.game.player(ownerSeat).battleArea).filter(
    (perm) =>
      perm.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(perm.topCard)) &&
      ctx.game.definitionOf(perm.topCard).nameEn === name &&
      perm.isSuspended,
  );

/** Owner battle-area Digimon (the "1 of your Digimon" attacker candidates). */
const ownDigimon = (ctx: EffectContext, ownerSeat: Seat): Permanent[] =>
  Array.from(ctx.game.player(ownerSeat).battleArea).filter(
    (perm) => perm.topCard !== undefined && isDigimon(ctx.game.definitionOf(perm.topCard)),
  );

/** Branch A: optionally play 1 [Xros Heart] Digimon (DP ≤ 4000) from under a Tamer without cost. */
const playXrosHeartFromUnderTamer = async (ctx: EffectContext, ownerSeat: Seat): Promise<void> => {
  const candidates = xrosHeartUnderTamer(ctx, ownerSeat);
  if (candidates.length === 0) return;
  // "You may" — optional play.
  const willPlay = await ctx.ask.optional(
    ctx,
    "Play 1 [Xros Heart] Digimon (4000 DP or less) from under your Tamer without paying the cost?",
  );
  if (!willPlay) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  const picked = chosen[0];
  if (picked !== undefined) await ctx.fx.playInstances([picked], { payCost: false });
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Modal: choose 1 of 2 effects.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-modal`,
          description:
            "[Main] Activate 1 of the following effects: play 1 [Xros Heart] Digimon (4000 DP or " +
            "less) from under your Tamer without paying the cost; OR by unsuspending 1 [Shoutmon " +
            "EX6] and 1 [ShootingStarmon], attack a player with 1 of your Digimon.",
          optional: false,
          resolve: async (ctx) => {
            const owner = source.ownerSeat;
            const choice = await ctx.ask.chooseOption(ctx, [
              "Play 1 [Xros Heart] Digimon from under your Tamer",
              "Unsuspend 1 [Shoutmon EX6] and 1 [ShootingStarmon] to attack a player",
            ]);

            if (choice === 0) {
              await playXrosHeartFromUnderTamer(ctx, owner);
              return;
            }

            // Branch B. Q3159: BOTH a Shoutmon EX6 and a ShootingStarmon must be unsuspendable —
            // the "by doing X" cost cannot be partially met.
            const shoutmons = suspendedNamed(ctx, owner, "Shoutmon EX6");
            const starmons = suspendedNamed(ctx, owner, "ShootingStarmon");
            if (shoutmons.length === 0 || starmons.length === 0) return;

            const chosenShoutmon = await ctx.ask.chooseTargets(ctx, {
              candidates: shoutmons.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenShoutmon.length === 0) return;
            const chosenStarmon = await ctx.ask.chooseTargets(ctx, {
              candidates: starmons.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenStarmon.length === 0) return;

            // Pay the cost: unsuspend both.
            ctx.fx.unsuspend([chosenShoutmon[0]!, chosenStarmon[0]!]);

            // Attack a player with 1 of your Digimon.
            const attackers = ownDigimon(ctx, owner);
            if (attackers.length === 0) return;
            const chosenAttacker = await ctx.ask.chooseTargets(ctx, {
              candidates: attackers.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            const attackerId = chosenAttacker[0];
            if (attackerId !== undefined) await ctx.fx.forceAttack(attackerId);
          },
        }),
      ];
    }

    // [Security] You may play 1 [Xros Heart] Digimon (4000 DP or less) from under your Tamer
    // without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-xros-heart-under-tamer`,
          description:
            "[Security] You may play 1 Digimon card with the [Xros Heart] trait and 4000 DP or " +
            "less from under your Tamer without paying the cost.",
          optional: false,
          resolve: (ctx) => playXrosHeartFromUnderTamer(ctx, source.ownerSeat),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
