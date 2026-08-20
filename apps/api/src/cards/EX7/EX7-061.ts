import { CardColor, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX7-061";

function isLilithmonOrXAntibody(def: CardDefinition): boolean {
  return def.nameEn === "Lilithmon" || (def.types ?? []).includes("Lilithmon X Antibody");
}

function isPurpleLv4OrLowerDigimon(def: CardDefinition): boolean {
  return isDigimon(def) && (def.colors ?? []).includes(CardColor.Purple) && (def.level ?? 99) <= 4;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/self-protection`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other " +
            "than in battle, if [Lilithmon]/[X Antibody] in its digivolution cards, by " +
            "deleting 1 other Digimon, prevent it from leaving.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            return self.stack.some((c) => isLilithmonOrXAntibody(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/self-protect`,
              description:
                "[All Turns] [Once Per Turn] Prevent this Digimon from leaving by deleting 1 other Digimon.",
              protects: (_subCtx, leavingId) => leavingId === self.permanentId,
              preventCheck: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return false;
                if (!currentSelf.stack.some((c) => isLilithmonOrXAntibody(subCtx.game.definitionOf(c)))) {
                  return false;
                }
                const owner = subCtx.game.player(source.ownerSeat);
                const otherDigimon = Array.from(owner.battleArea)
                  .filter((p) => p.permanentId !== self.permanentId && p.topCard !== undefined && isDigimon(subCtx.game.definitionOf(p.topCard)))
                  .map((p) => p.permanentId);
                if (otherDigimon.length === 0) return false;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Delete 1 other Digimon to prevent this Digimon from leaving?",
                );
                if (!yes) return false;
                const toDelete = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: otherDigimon,
                  min: 1,
                  max: 1,
                });
                if (toDelete.length === 0) return false;
                const deleted = await subCtx.fx.deletePermanent(toDelete);
                return deleted > 0;
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/on-deletion-play-or-trash`,
          description:
            "[All Turns] [Once Per Turn] When another Digimon is deleted, if it's your turn, " +
            "you may play 1 purple level 4 or lower Digimon card from your trash without " +
            "paying the cost. If it's your opponent's turn, trash the top card of their " +
            "security stack.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/on-deletion-play-or-trash`,
              description: `${cardId}: When another Digimon deleted, play or trash.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                if (subjectId === self.permanentId) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                if (subCtx.source.isOwnersTurn()) {
                  const owner = subCtx.game.player(source.ownerSeat);
                  const qualifying = Array.from(owner.trash).filter((c) =>
                    isPurpleLv4OrLowerDigimon(subCtx.game.definitionOf(c)),
                  );
                  if (qualifying.length > 0) {
                    const yes = await subCtx.ask.optional(
                      subCtx,
                      "Play 1 purple level 4 or lower Digimon from your trash without paying the cost?",
                    );
                    if (yes) {
                      const chosen = await subCtx.ask.selectCards(subCtx, {
                        candidates: qualifying.map((c) => c.instanceId),
                        min: 0,
                        max: 1,
                      });
                      if (chosen.length > 0) {
                        await subCtx.fx.playInstances(chosen, { payCost: false });
                      }
                    }
                  }
                } else {
                  const opponent = subCtx.game.opponentOf(source.ownerSeat);
                  await subCtx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
                }
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
