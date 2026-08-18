import { CardColor, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT6-077";

// "Until the end of your opponent's next turn".
const grantDuration = EffectDuration.UntilOpponentTurnEnd;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] You may trash 1 card in your hand to have this Digimon gain
    // ＜Blocker＞ and ＜Retaliation＞ until the end of your opponent's next turn.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/gain-blocker-retaliation`,
          description:
            "[When Digivolving] You may trash 1 card in your hand to have this Digimon gain " +
            "＜Blocker＞ and ＜Retaliation＞ until the end of your opponent's next turn.",
          // "You may": the resolver asks the controller
          // before running resolve.
          optional: true,
          // hand (the trash is the cost; with an empty hand the effect cannot activate).
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.game.player(source.ownerSeat).hand.length >= 1,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            // Trash 1 card from hand (the cost). canActivate guaranteed >= 1 card; the
            // controller chose to use the effect, so the trash is mandatory (min 1).
            const handIds = Array.from(ctx.game.player(source.ownerSeat).hand).map(
              (card) => card.instanceId,
            );
            const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 1, max: 1 });
            if (toTrash.length === 0) return; // nothing trashed => no grant (documented behavior `discarded` gate)
            await ctx.fx.trash(toTrash);

            // Grant ＜Blocker＞ and ＜Retaliation＞ to this Digimon for the duration
            //. Both are
            // continuous keyword grants the combat / keyword-abilities subsystem reads.
            ctx.fx.grantKeyword(self.permanentId, "Blocker", grantDuration);
            ctx.fx.grantKeyword(self.permanentId, "Retaliation", grantDuration);
          },
        }),
      ];
    }

    // [All Turns] This Digimon is also treated as black (documented behavior rule implementation,
    // gated on IsExistOnBattleArea).
    //
    // `ctx.fx.addColorGrant` records a continuous color grant on the
    // ContinuousEffectLedger; `grantedColors` feeds the digivolution color-requirement
    // check and color-referencing filters (see BT3-040, the hand-written vehicle for
    // the identical "[Your Turn]/[All Turns] treated as <color>" clause). Not gated to
    // either player's turn (unlike BT3-040/BT3-014's [Your Turn] variant), so the grant
    // uses UntilEachTurnEnd and is re-derived every continuous-recompute pass, same as
    // this card's own ＜Security Attack -1＞-style statics. Per Q1466 the treatment is
    // load-bearing for digivolution color requirements.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/also-treated-as-black`,
          description: "[All Turns] This Digimon is also treated as black.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.addColorGrant(self.permanentId, CardColor.Black, EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
