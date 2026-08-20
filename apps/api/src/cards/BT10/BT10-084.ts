import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-084";

function isBagraArmyLevel4OrLower(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Digimon as string)) return false;
  if (def.level === undefined) return false;
  if (def.level > 4) return false;
  const traits = (def.types as string[] | undefined) ?? [];
  return traits.includes("Bagra Army") || traits.includes("BagraArmy");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [On Play] Play up to 2 Bagra Army Lv.4 or lower Digimon from trash; they gain Blocker.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-bagra-army-from-trash`,
          description:
            "[On Play] Play up to 2 Lv.4 or lower Digimon with the Bagra Army trait from your trash " +
            "without paying the cost. Those Digimon gain ＜Blocker＞ until the end of your opponent's turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const trash = ctx.game.player(ownerSeat).trash;
            return trash.some((c) => isBagraArmyLevel4OrLower(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const trash = ctx.game.player(ownerSeat).trash;
            const candidates = trash
              .filter((c) => isBagraArmyLevel4OrLower(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 2,
            });
            if (chosen.length === 0) return;

            const played = await ctx.fx.playInstances(chosen, { payCost: false });

            // Grant Blocker to each played Digimon.
            for (const perm of played) {
              ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    // [Opponent's Turn] When an effect would trash one of your other Digimon's digivolution
    // cards, you may trash this Digimon's digivolution cards instead (KB Q2002-Q2008).
    // Installed as a continuous "redirect" replacement anchored on this permanent, mirroring the
    // leave-prevention pattern (e.g. BT20-027's inherited suspend-to-prevent).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponents-turn-redirect-digivolution-trash`,
          description:
            "[Opponent's Turn] When an effect would trash one of your other Digimon's " +
            "digivolution cards, you may trash this Digimon's digivolution cards instead.",
          isInherited: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldTrashDigivolutionCard",
              sourcePermanentId: hostId,
              mode: "redirect",
              description:
                "[Opponent's Turn] You may trash this Digimon's digivolution cards instead of " +
                "another of your Digimon's.",
              // Q2002: eligible even when THIS card (the redirect target) has 0 digivolution
              // cards of its own — the trashing site itself clamps the count to what's there.
              appliesTo: (subCtx, originalHostId) => {
                // Never redirect a trash that's already targeting this card's own stack.
                if (originalHostId === hostId) return false;
                const originalHost = subCtx.game.permanentById(originalHostId);
                if (originalHost === undefined) return false;
                // "one of YOUR other Digimon's" — same controller as this card.
                if (originalHost.controllerSeat !== ownerSeat) return false;
                // "[Opponent's Turn]" — only active while it is this card's controller's
                // opponent's turn.
                return subCtx.game.state.turnSeat !== ownerSeat;
              },
              redirectTo: async (subCtx) => {
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "＜Tactimon＞: trash this Digimon's digivolution cards instead?",
                );
                if (!yes) return undefined;
                return subCtx.source.permanent()?.permanentId;
              },
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
