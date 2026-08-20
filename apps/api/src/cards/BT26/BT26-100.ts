import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, security, securityStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-100 — Dark Field (BT26, Purple/Black Option, [Titan]/[TS] trait).
//
// Q7174–Q7181 confirm the no-face-up-security condition, zero-security Main activation,
// face-up security behavior, Security timing, and that the DP/Blocker grant only applies
// to [Titan] trait Digimon.
//
// Printed text:
//   While you have no face-up security cards, you can ignore this card's color
//     requirements.
//   [Security] [All Turns] All of your [Titan] trait Digimon gain <Blocker>. While you
//     have a Digimon with [Plutomon] or [Titamon] in its name, they also get +3000 DP.
//   [Main] Add your bottom security card to the hand and place this card face up as the
//     bottom security card. Then, you may play 1 level 4 or lower [Titan] trait card
//     from your hand or trash without paying the cost.
//   [Security] (securityEffectText, the on-check clause) You may play 1 level 4 or lower
//     [Titan] trait Digimon card from your hand or trash without paying the cost.
//
// Clause mapping (mirrors the reviewed hand-written EX12-072, the same "recycle bottom
// security" Option shape, down to its own `securityStatic`-gated `[Security][All Turns]`
// grant and its `[Main]`/`securityEffectText` split; and BT9-109's inline conditional
// color-requirement-waiver idiom):
//
//   - "While you have no face-up security cards, you can ignore this card's color
//     requirements." -> EffectTiming.None, `staticModifier` with a `when` gate on the
//     condition (mirrors BT9-109's `<Use Req.>`-shaped inline waiver — this is prose
//     text, not a `<Use Req.>` bracket header, so it is executable via
//     `ctx.fx.waiveColorRequirement`, unlike the bracket-header `<Use Req.>` gap
//     documented on BT26-101/BT26-033).
//
//   - "[Security] [All Turns] ..." -> EffectTiming.None, `securityStatic` gated on
//     this card being face-up in Security, so the grant remains live between checks.
//
//   - "[Main] Add your bottom security card to the hand and place this card face up as
//     the bottom security card." -> EffectTiming.OnUseOption, `activated`, using the
//     same `securityToHand`(bottom) + `addSecurity`(self, bottom, faceUp) pair EX12-072
//     uses for its identical clause.
//     "Then, you may play 1 level 4 or lower [Titan] trait card from your hand or trash
//     without paying the cost." -> appended to the same resolve body (optional
//     `selectCards` + `playInstances({ payCost: false })`, the BT26-045/BT25-101 free-
//     play idiom). Not restricted to Digimon kind (the printed text says "card", not
//     "Digimon card" — see the `securityEffectText` clause below for the contrast).
//
//   - `securityEffectText` "[Security] You may play 1 level 4 or lower [Titan] trait
//     Digimon card from your hand or trash without paying the cost." ->
//     EffectTiming.SecuritySkill, the `security` builder (EX12-072/BT26-098 idiom).
//     Restricted to Digimon kind, matching the printed "Digimon card" wording.

const cardId = "BT26-100";
const TITAN_TRAIT = "Titan";
const MAX_FREE_PLAY_LEVEL = 4;
const DP_BONUS_NAMES = ["Plutomon", "Titamon"];

function hasTitanTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes(TITAN_TRAIT);
}

function namedPlutomonOrTitamon(def: CardDefinition): boolean {
  return DP_BONUS_NAMES.some((token) => def.nameEn.includes(token));
}

/** The controller's battle-area [Titan] trait Digimon permanents. */
function titanBattleTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) =>
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      hasTitanTrait(ctx.game.definitionOf(p.topCard)),
  );
}

/** Does the controller have a Digimon with [Plutomon] or [Titamon] in its name? */
function hasPlutomonOrTitamonDigimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).some(
    (p) =>
      p.topCard !== undefined &&
      isDigimon(ctx.game.definitionOf(p.topCard)) &&
      namedPlutomonOrTitamon(ctx.game.definitionOf(p.topCard)),
  );
}

/** Whether the controller currently has no face-up security card. */
function hasNoFaceUpSecurity(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  return !owner.security.some((c) => c.faceUp);
}

/** Level <=4 [Titan] trait CARDS (any kind — the [Main] clause says "card", not "Digimon card"). */
function freePlayAnyKindCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...owner.hand, ...owner.trash].filter((c) => {
    const def = ctx.game.definitionOf(c);
    return def.level !== undefined && def.level <= MAX_FREE_PLAY_LEVEL && hasTitanTrait(def);
  });
}

/** Level <=4 [Titan] trait DIGIMON cards (the securityEffectText clause says "Digimon card"). */
function freePlayDigimonCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...owner.hand, ...owner.trash].filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && def.level !== undefined && def.level <= MAX_FREE_PLAY_LEVEL && hasTitanTrait(def);
  });
}

async function offerFreePlay(ctx: EffectContext, candidates: CardInstance[]): Promise<void> {
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.playInstances(chosen, { payCost: false });
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        // While you have no face-up security cards, you can ignore this card's color
        // requirements.
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/color-waiver-no-face-up-security`,
          description: "While you have no face-up security cards, you can ignore this card's color requirements.",
          optional: false,
          when: (ctx) => hasNoFaceUpSecurity(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),

        // [Security] [All Turns] All of your [Titan] trait Digimon gain <Blocker>.
        // While you have a Digimon with [Plutomon] or [Titamon] in its name, they also
        // get +3000 DP. See the header note: gated on battle-area residency (the
        // EX12-072 convention), not on security-stack residency — the engine has no
        // gate for the latter.
        securityStatic({
          source,
          effectKey: `${cardId}/security-all-turns-titan-blocker-dp`,
          description:
            "[Security] [All Turns] All of your [Titan] trait Digimon gain <Blocker>. " +
            "While you have a Digimon with [Plutomon] or [Titamon] in its name, they " +
            "also get +3000 DP.",
          optional: false,
          when: (_ctx) => source.isInSecurity?.() === true,
          resolve: async (ctx) => {
            const withBonus = hasPlutomonOrTitamonDigimon(ctx, source);
            for (const perm of titanBattleTargets(ctx, source)) {
              ctx.fx.grantKeyword(perm.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
              if (withBonus) {
                ctx.fx.modifyDP(perm.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      ];
    }

    // [Main] Add your bottom security card to the hand and place this card face up as
    // the bottom security card. Then, you may play 1 level 4 or lower [Titan] trait
    // card from your hand or trash without paying the cost.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Add your bottom security card to the hand and place this card face " +
            "up as the bottom security card. Then, you may play 1 level 4 or lower " +
            "[Titan] trait card from your hand or trash without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            const ownerSeat = source.ownerSeat;
            const owner = ctx.game.player(ownerSeat);

            if (owner.security.length > 0) {
              await ctx.fx.securityToHand(ownerSeat, 1, { fromTop: false });
            }
            await ctx.fx.addSecurity(ownerSeat, [source.instanceId], { toTop: false, faceUp: true });

            await offerFreePlay(ctx, freePlayAnyKindCandidates(ctx, source));
          },
        }),
      ];
    }

    // [Security] You may play 1 level 4 or lower [Titan] trait Digimon card from your
    // hand or trash without paying the cost. (securityEffectText — the on-check clause.)
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description:
            "[Security] You may play 1 level 4 or lower [Titan] trait Digimon card from " +
            "your hand or trash without paying the cost.",
          optional: false,
          resolve: async (ctx) => {
            await offerFreePlay(ctx, freePlayDigimonCandidates(ctx, source));
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
