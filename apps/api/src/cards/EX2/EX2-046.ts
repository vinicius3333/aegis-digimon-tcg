import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import type { CompiledCard } from "@aegis/shared";

/**
 * EX2-046 — ADR-02 Searcher (EX2, White Lv.2 Digimon).
 *
 * Static: Play cost -2 if you don't have another [ADR-02 Searcher] in play.
 * [Your Turn]: This Digimon cannot attack players.
 * [On Play]: Draw 1.
 * Inherited [Your Turn]: Your D-Reaper trait Digimon get +1000 DP.
 */
const cardId = "EX2-046";

function hasDReaperTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "D-Reaper" || t === "DReaper");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // Static: Play cost -2 if no other ADR-02 Searcher in play.
    if (timing === EffectTiming.None) {
      out.push({
        effectKey: `${cardId}/play-cost-2`,
        description:
          "You may play this card at a cost of 2 less if you don't have another [ADR-02 Searcher] in play.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => {
          const hand = ctx.game.player(source.ownerSeat).hand;
          if (!hand.some((c) => c.instanceId === ctx.source.instanceId)) return false;
          const battle = ctx.game.player(source.ownerSeat).battleArea;
          return !battle.some((p) => {
            if (p.topCard === undefined) return false;
            if (p.permanentId === ctx.source.instanceId) return false;
            const def = ctx.game.definitionOf(p.topCard);
            return def.nameEn.includes("ADR-02 Searcher");
          });
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          ctx.fx.changePlayCost(
            (facts) => facts.def.cardId === source.cardId,
            -2,
          );
        },
      });
    }

    // [Your Turn]: Cannot attack players.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/cant-attack-players`,
          description: "[Your Turn] This Digimon can't attack players.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.restrict(self.permanentId, "attackPlayers", EffectDuration.Permanent);
          },
        }),
      );
    }

    // [On Play]: Draw 1.
    if (timing === EffectTiming.OnPlay) {
      out.push(
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw`,
          description: "[On Play] Draw 1 card from your deck.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      );
    }

    // Inherited [Your Turn]: D-Reaper trait Digimon +1000 DP.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/inh-d-reaper-dp`,
          description: "Inherited: [Your Turn] Your Digimon with [D-Reaper] in their traits get +1000 DP.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const perm of ctx.game.player(source.ownerSeat).battleArea) {
              if (perm.topCard === undefined) continue;
              if (!isDigimon(ctx.game.definitionOf(perm.topCard))) continue;
              const def = ctx.game.definitionOf(perm.topCard);
              if (hasDReaperTrait(def)) {
                ctx.fx.modifyDP(perm.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);

// The 50-copy rule is represented by the catalog's maxCountInDeck: 50. The remaining printed
// clauses are registered as executable IR so the interpreter does not fall back to residual data.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine" }, actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2, raw: "reduce its play cost by 2 if you don't have another [ADR-02 Searcher] in play", condition: { kind: "youHaveNone", filter: { zone: "battleArea", controllerDefault: "mine", nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }] }, raw: "you don't have another [ADR-02 Searcher] in play" } }] }],
    },
    {
      trigger: "YourTurn",
      actions: [{ kind: "Restrict", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, restriction: "attackPlayers", duration: "permanent" }],
    },
    { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 1 }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }] }, count: "all" }, amount: 1000, duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
