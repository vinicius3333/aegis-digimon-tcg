// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT20-071";

function hasSocOrSeekersTrait(def: CardDefinition): boolean {
  const types = def.types as string[] | undefined;
  return types?.some((t) => t === "SoC" || t === "SEEKERS") ?? false;
}

/** Shared resolve body for [On Play] and [When Digivolving]. */
async function trashHandAndGrantRaid(
  ctx: Parameters<Effect["resolve"]>[0],
): Promise<void> {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  const handCards = Array.from(owner.hand).map((c) => c.instanceId);
  if (handCards.length === 0) return;

  // Cost: trash 1 card from hand.
  const trashChosen = await ctx.ask.selectCards(ctx, {
    candidates: handCards,
    min: 0,
    max: 1,
  });
  if (trashChosen.length === 0) return;
  await ctx.fx.trash(trashChosen);

  // Then choose 1 of your Digimon on the battle area.
  const myDigimon = Array.from(owner.battleArea)
    .filter((p) => {
      if (p.topCard === undefined) return false;
      return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (myDigimon.length === 0) return;

  const targetIds =
    myDigimon.length === 1
      ? [myDigimon[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: myDigimon, min: 1, max: 1 });

  for (const id of targetIds) {
    ctx.fx.grantKeyword(id, "Raid", EffectDuration.UntilEachTurnEnd);
    ctx.fx.modifyDP(id, 3000, EffectDuration.UntilEachTurnEnd);
  }
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play]: trash 1 hand card → 1 of your Digimon gains Raid and +3000 DP for the turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-raid`,
          description:
            "[On Play] By trashing 1 card in your hand, for the turn, 1 of your Digimon " +
            "gains ＜Raid＞ and gets +3000 DP.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(ctx.source.ownerSeat).hand.length > 0;
          },
        }],
      }],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{
        kind: "DisableSecurityEffect",
        target: { filter: { isSelf: true }, count: 1 },
        sourceKind: "option",
        duration: "permanent",
      }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { names: ["Loogarmon"], cost: 3, isAlternate: true },
    { level: 4, traits: ["SEEKERS"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT20-071", compiled);
