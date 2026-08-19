import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT21-087";

function hasVemmonText(def: {
  effectText?: string;
  inheritedEffectText?: string;
  securityEffectText?: string;
  linkEffectText?: string;
}): boolean {
  return [def.effectText, def.inheritedEffectText, def.securityEffectText, def.linkEffectText].some(
    (text) => text?.includes("Vemmon") === true,
  );
}

async function revealZenith(ctx: EffectContext, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);
  if (revealed.length === 0) return;
  const playCandidates = revealed
    .filter((card) => ctx.game.definitionOf(card).nameEn === "Vemmon")
    .map((card) => card.instanceId);
  const addCandidates = revealed
    .filter((card) => hasVemmonText(ctx.game.definitionOf(card)))
    .map((card) => card.instanceId);
  const choices: string[] = [];
  if (playCandidates.length > 0) choices.push("Play a Vemmon");
  if (addCandidates.length > 0) choices.push("Add a card with Vemmon in its text");
  const selectedMode = choices.length > 1 ? await ctx.ask.chooseOption(ctx, choices) : 0;
  const candidates = choices[selectedMode] === "Play a Vemmon" ? playCandidates : addCandidates;
  const selected = candidates.length > 0 ? await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 }) : [];
  if (selected.length > 0) {
    if (choices[selectedMode] === "Play a Vemmon") await ctx.fx.playInstances(selected, { payCost: false });
    else await ctx.fx.returnToHand(selected);
  }
  const rest = revealed.filter((card) => !selected.includes(card.instanceId)).map((card) => card.instanceId);
  if (rest.length > 0) await ctx.fx.returnToDeck(rest, { toTop: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-reveal`,
          description:
            "[On Play] Reveal the top 3 cards of your deck. Play 1 [Vemmon] without paying the cost or add 1 card with [Vemmon] in its text to the hand. Trash the rest.",
          optional: false,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length > 0,
          resolve: async (ctx) => revealZenith(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
