// @ts-nocheck
// Hand-audited implementation for LM-026 (Megidramon).
import type { CompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "LM-026";
const compiled: CompiledCard = {
  effects: [
    { trigger: "Counter", actions: [], isFromHand: true, keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }] },
    { trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 } }] },
    { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 } }] },
    { trigger: "Rule", actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, grant: "name", tokens: ["ChaosGallantmon"] }] },
    { trigger: "AllTurns", actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 5000 }], isInherited: true },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, names: ["Growlmon"], cost: 3, isAlternate: true }],
};

const base = irCardModule(cardId, compiled);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const effects = [...base.effectsForTiming(timing, source)];
    if (timing !== EffectTiming.None) return effects;
    effects.push(
      staticModifier({
        source,
        effectKey: `${cardId}/leave-play-guilmon`,
        description: "[All Turns] When this Digimon would leave, play a Guilmon from its stack or trash and place this card under it.",
        when: (_ctx) => source.isOnBattleArea() && source.permanent() !== undefined,
        resolve: async (ctx) => {
          const host = source.permanent();
          if (host === undefined) return;
          const hostId = host.permanentId;
          ctx.fx.subscribeReplacement({
            event: "wouldLeavePlay",
            sourcePermanentId: hostId,
            mode: "prevent",
            description: `${cardId}: play Guilmon and place this card underneath instead of leaving`,
            protects: (_subCtx, leavingId) => leavingId === hostId,
            preventCheck: async (subCtx, leavingId) => {
              if (leavingId !== hostId) return false;
              const current = subCtx.game.permanentById(hostId);
              if (current === undefined) return false;
              const owner = subCtx.game.player(source.ownerSeat);
              const candidates = [
                ...Array.from(current.stack).filter((c) => subCtx.game.definitionOf(c).nameEn.includes("Guilmon")),
                ...Array.from(owner.trash).filter((c) => subCtx.game.definitionOf(c).nameEn.includes("Guilmon")),
              ];
              if (candidates.length === 0) return false;
              const chosen = await subCtx.ask.selectCards(subCtx, { candidates: candidates.map((c) => c.instanceId), min: 1, max: 1 });
              if (chosen.length === 0) return false;
              const played = await subCtx.fx.playInstances(chosen, { payCost: false });
              if (played.length === 0) return false;
              const moved = await subCtx.fx.placeUnder(played[0].permanentId, [source.instanceId]);
              return moved.length === 1;
            },
          });
        },
      }),
    );
    return effects;
  },
};

registerCard(module);
export default module;
